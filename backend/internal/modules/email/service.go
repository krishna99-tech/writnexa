package email

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

type UpdatePreferencesInput struct {
	EmailOnNewFollower    bool `json:"email_on_new_follower"`
	EmailOnNewComment     bool `json:"email_on_new_comment"`
	EmailOnReply          bool `json:"email_on_reply"`
	EmailOnArticlePublish bool `json:"email_on_article_publish"`
}

type Service interface {
	Enqueue(ctx context.Context, recipientEmail, recipientName string, tName TemplateName, payload any) (*db.EmailOutbox, error)
	EnqueueWithPreferenceCheck(ctx context.Context, userID uuid.UUID, recipientEmail, recipientName string, tName TemplateName, payload any) (*db.EmailOutbox, error)
	GetPreferences(ctx context.Context, userID uuid.UUID) (*db.NotificationPreference, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, input UpdatePreferencesInput) (*db.NotificationPreference, error)
	GetEngine() *TemplateEngine
}

type service struct {
	cfg    *config.Config
	db     *database.DB
	q      *db.Queries
	engine *TemplateEngine
}

func NewService(cfg *config.Config, db *database.DB, q *db.Queries) Service {
	return &service{
		cfg:    cfg,
		db:     db,
		q:      q,
		engine: NewTemplateEngine(),
	}
}

func (s *service) GetEngine() *TemplateEngine {
	return s.engine
}

// Enqueue renders and stores an email in the PostgreSQL email_outbox table.
func (s *service) Enqueue(ctx context.Context, recipientEmail, recipientName string, tName TemplateName, payload any) (*db.EmailOutbox, error) {
	if s.q == nil {
		return nil, errors.New("database connection not available")
	}

	rendered, err := s.engine.Render(tName, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to render email template '%s': %w", tName, err)
	}

	payloadBytes, _ := json.Marshal(payload)

	outboxItem, err := s.q.EnqueueEmail(ctx, db.EnqueueEmailParams{
		RecipientEmail: recipientEmail,
		RecipientName:  recipientName,
		TemplateName:   string(tName),
		Subject:        rendered.Subject,
		HtmlBody:       rendered.HTMLBody,
		TextBody:       rendered.TextBody,
		PayloadJson:    payloadBytes,
		MaxRetries:     s.cfg.Email.MaxRetries,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to enqueue email in outbox: %w", err)
	}

	slog.Debug("Email successfully enqueued into outbox",
		slog.String("outbox_id", toUUID(outboxItem.ID).String()),
		slog.String("recipient", recipientEmail),
		slog.String("template", string(tName)),
	)

	return &outboxItem, nil
}

// EnqueueWithPreferenceCheck checks user notification preferences before enqueuing.
func (s *service) EnqueueWithPreferenceCheck(ctx context.Context, userID uuid.UUID, recipientEmail, recipientName string, tName TemplateName, payload any) (*db.EmailOutbox, error) {
	prefs, err := s.GetPreferences(ctx, userID)
	if err == nil && prefs != nil {
		switch tName {
		case TemplateNewFollower:
			if !prefs.EmailOnNewFollower {
				slog.Info("Skipping new_follower email due to user preferences", slog.String("user_id", userID.String()))
				return nil, nil
			}
		case TemplateNewComment:
			if !prefs.EmailOnNewComment {
				slog.Info("Skipping new_comment email due to user preferences", slog.String("user_id", userID.String()))
				return nil, nil
			}
		}
	}

	return s.Enqueue(ctx, recipientEmail, recipientName, tName, payload)
}

// GetPreferences fetches a user's notification preferences or creates defaults if absent.
func (s *service) GetPreferences(ctx context.Context, userID uuid.UUID) (*db.NotificationPreference, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	uid := toPgUUID(userID)
	prefs, err := s.q.GetNotificationPreferences(ctx, uid)
	if err == nil {
		return &prefs, nil
	}

	// Create defaults on first access
	created, err := s.q.UpsertNotificationPreferences(ctx, db.UpsertNotificationPreferencesParams{
		UserID:                 uid,
		EmailOnNewFollower:    true,
		EmailOnNewComment:     true,
		EmailOnReply:          true,
		EmailOnArticlePublish: true,
	})
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// UpdatePreferences updates user notification switches.
func (s *service) UpdatePreferences(ctx context.Context, userID uuid.UUID, input UpdatePreferencesInput) (*db.NotificationPreference, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	uid := toPgUUID(userID)
	updated, err := s.q.UpsertNotificationPreferences(ctx, db.UpsertNotificationPreferencesParams{
		UserID:                 uid,
		EmailOnNewFollower:    input.EmailOnNewFollower,
		EmailOnNewComment:     input.EmailOnNewComment,
		EmailOnReply:          input.EmailOnReply,
		EmailOnArticlePublish: input.EmailOnArticlePublish,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update notification preferences: %w", err)
	}

	return &updated, nil
}

// AuthEnqueuerAdapter adapts email.Service to auth.EmailEnqueuer.
type AuthEnqueuerAdapter struct {
	svc Service
}

func NewAuthEnqueuerAdapter(svc Service) *AuthEnqueuerAdapter {
	return &AuthEnqueuerAdapter{svc: svc}
}

func (a *AuthEnqueuerAdapter) Enqueue(ctx context.Context, recipientEmail, recipientName string, tName string, payload any) error {
	_, err := a.svc.Enqueue(ctx, recipientEmail, recipientName, TemplateName(tName), payload)
	return err
}

func toPgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: u, Valid: true}
}

func toUUID(pg pgtype.UUID) uuid.UUID {
	return uuid.UUID(pg.Bytes)
}
