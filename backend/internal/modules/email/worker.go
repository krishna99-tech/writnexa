package email

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

// Worker periodically scans the email_outbox for pending messages and sends them.
type Worker struct {
	cfg     *config.Config
	db      *database.DB
	q       *db.Queries
	sender  Sender
	stopCh  chan struct{}
	wg      sync.WaitGroup
	running bool
	mu      sync.Mutex
}

func NewWorker(cfg *config.Config, db *database.DB, q *db.Queries, sender Sender) *Worker {
	return &Worker{
		cfg:    cfg,
		db:     db,
		q:      q,
		sender: sender,
		stopCh: make(chan struct{}),
	}
}

// Start launches the background worker loop in a goroutine.
func (w *Worker) Start(ctx context.Context) {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	w.running = true
	w.mu.Unlock()

	w.wg.Add(1)
	go w.run(ctx)
	slog.Info("Email background outbox worker started",
		slog.Duration("poll_interval", w.cfg.Email.WorkerPoll),
		slog.Int("batch_size", int(w.cfg.Email.WorkerBatch)),
	)
}

// Stop gracefully halts the background worker.
func (w *Worker) Stop() {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return
	}
	close(w.stopCh)
	w.running = false
	w.mu.Unlock()

	w.wg.Wait()
	slog.Info("Email background outbox worker stopped gracefully")
}

func (w *Worker) run(ctx context.Context) {
	defer w.wg.Done()
	ticker := time.NewTicker(w.cfg.Email.WorkerPoll)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			processed, err := w.ProcessBatch(ctx)
			if err != nil {
				slog.Error("Error processing email outbox batch", slog.String("error", err.Error()))
			} else if processed > 0 {
				slog.Debug("Outbox worker processed email batch", slog.Int("count", processed))
			}
		}
	}
}

// ProcessBatch fetches and dispatches a single batch of pending outbox emails.
func (w *Worker) ProcessBatch(ctx context.Context) (int, error) {
	if w.q == nil {
		return 0, fmt.Errorf("database queries not initialized")
	}

	limit := w.cfg.Email.WorkerBatch
	if limit <= 0 {
		limit = 10
	}

	emails, err := w.q.FetchPendingEmails(ctx, limit)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch pending emails: %w", err)
	}

	if len(emails) == 0 {
		return 0, nil
	}

	processedCount := 0
	for _, item := range emails {
		w.processSingleEmail(ctx, item)
		processedCount++
	}

	return processedCount, nil
}

func (w *Worker) processSingleEmail(ctx context.Context, item db.EmailOutbox) {
	// 1. Mark as sending
	_ = w.q.MarkEmailSending(ctx, item.ID)

	// 2. Prepare message
	msg := Message{
		ToEmail:   item.RecipientEmail,
		ToName:    item.RecipientName,
		FromEmail: w.cfg.Email.FromAddress,
		ReplyTo:   w.cfg.Email.ReplyTo,
		Subject:   item.Subject,
		HTMLBody:  item.HtmlBody,
		TextBody:  item.TextBody,
	}

	// 3. Dispatch via configured Sender
	res, err := w.sender.Send(ctx, msg)
	if err != nil {
		w.handleSendFailure(ctx, item, err)
		return
	}

	// 4. Mark success in outbox and audit log
	w.handleSendSuccess(ctx, item, res)
}

func (w *Worker) handleSendSuccess(ctx context.Context, item db.EmailOutbox, res *SendResult) {
	msgIDText := pgtype.Text{String: res.MessageID, Valid: res.MessageID != ""}

	// Update outbox table
	_ = w.q.MarkEmailSent(ctx, db.MarkEmailSentParams{
		ID:           item.ID,
		SesMessageID: msgIDText,
	})

	// Record in email_logs audit trail
	_, _ = w.q.CreateEmailLog(ctx, db.CreateEmailLogParams{
		OutboxID:       item.ID,
		RecipientEmail: item.RecipientEmail,
		Subject:        item.Subject,
		Status:         "sent",
		SesMessageID:   msgIDText,
		ErrorMessage:   pgtype.Text{Valid: false},
		AttemptNumber:  item.RetryCount + 1,
	})

	slog.Info("Email successfully dispatched via outbox worker",
		slog.String("outbox_id", toUUID(item.ID).String()),
		slog.String("recipient", item.RecipientEmail),
		slog.String("ses_message_id", res.MessageID),
	)
}

func (w *Worker) handleSendFailure(ctx context.Context, item db.EmailOutbox, err error) {
	errText := err.Error()

	// Calculate exponential backoff for next retry:
	// retry 0 -> 15s
	// retry 1 -> 30s
	// retry 2 -> 60s
	backoffSec := int(math.Pow(2, float64(item.RetryCount))) * 15
	nextRetry := time.Now().UTC().Add(time.Duration(backoffSec) * time.Second)

	_ = w.q.MarkEmailFailed(ctx, db.MarkEmailFailedParams{
		ID:          item.ID,
		NextRetryAt: pgtype.Timestamptz{Time: nextRetry, Valid: true},
		LastError:   pgtype.Text{String: errText, Valid: true},
	})

	// Record failure in email_logs
	_, _ = w.q.CreateEmailLog(ctx, db.CreateEmailLogParams{
		OutboxID:       item.ID,
		RecipientEmail: item.RecipientEmail,
		Subject:        item.Subject,
		Status:         "failed",
		SesMessageID:   pgtype.Text{Valid: false},
		ErrorMessage:   pgtype.Text{String: errText, Valid: true},
		AttemptNumber:  item.RetryCount + 1,
	})

	slog.Warn("Failed to send email; queued for retry",
		slog.String("outbox_id", toUUID(item.ID).String()),
		slog.String("recipient", item.RecipientEmail),
		slog.Int("attempt", int(item.RetryCount+1)),
		slog.Time("next_retry_at", nextRetry),
		slog.String("error", errText),
	)
}
