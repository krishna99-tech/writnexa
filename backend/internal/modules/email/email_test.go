package email

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) (*database.DB, *db.Queries, *config.Config) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	return pool, queries, cfg
}

func TestTemplateEngine_AllTemplates(t *testing.T) {
	engine := NewTemplateEngine()

	// 1. Welcome
	res, err := engine.Render(TemplateWelcome, WelcomeData{
		BaseEmailData: BaseEmailData{PlatformURL: "http://localhost:3000"},
		Username:      "alexdev",
		DisplayName:   "Alex Developer",
		ProfileURL:    "http://localhost:3000/author/alexdev",
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "Welcome to QUORIX, @alexdev")
	assert.Contains(t, res.HTMLBody, "Launch Author Studio")
	assert.Contains(t, res.TextBody, "Welcome to QUORIX, @alexdev")

	// 2. Email Verification
	res, err = engine.Render(TemplateEmailVerification, VerificationData{
		BaseEmailData:   BaseEmailData{PlatformURL: "http://localhost:3000"},
		Username:        "alexdev",
		VerificationURL: "http://localhost:3000/verify-email?token=abcdef123",
		Token:           "abcdef123",
		ExpiresInHours:  24,
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "Verify your email address")
	assert.Contains(t, res.HTMLBody, "abcdef123")
	assert.Contains(t, res.TextBody, "abcdef123")

	// 3. Password Reset
	res, err = engine.Render(TemplatePasswordReset, PasswordResetData{
		BaseEmailData:  BaseEmailData{PlatformURL: "http://localhost:3000"},
		Username:       "alexdev",
		ResetURL:       "http://localhost:3000/reset-password?token=rst999",
		Token:          "rst999",
		ExpiresInHours: 1,
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "Reset your QUORIX account password")
	assert.Contains(t, res.HTMLBody, "rst999")

	// 4. Password Changed
	res, err = engine.Render(TemplatePasswordChanged, PasswordChangedData{
		BaseEmailData: BaseEmailData{
			PlatformURL:  "http://localhost:3000",
			SupportEmail: "security@quorix.io",
		},
		Username:    "alexdev",
		Timestamp:   "2026-11-01 21:00 UTC",
		IPAddress:   "192.168.1.1",
		UserAgent:   "Chrome 130 on macOS",
		SettingsURL: "http://localhost:3000/settings",
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "Security Alert")
	assert.Contains(t, res.HTMLBody, "192.168.1.1")

	// 5. New Follower
	res, err = engine.Render(TemplateNewFollower, NewFollowerData{
		BaseEmailData:    BaseEmailData{PlatformURL: "http://localhost:3000"},
		AuthorUsername:   "alexdev",
		FollowerUsername: "torvalds",
		FollowerName:     "Linus Torvalds",
		FollowerProfile:  "http://localhost:3000/author/torvalds",
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "@torvalds started following you")
	assert.Contains(t, res.HTMLBody, "Linus Torvalds")

	// 6. New Comment
	res, err = engine.Render(TemplateNewComment, NewCommentData{
		BaseEmailData:     BaseEmailData{PlatformURL: "http://localhost:3000"},
		AuthorUsername:    "alexdev",
		CommenterUsername: "gopher",
		ArticleTitle:      "Go Concurrency Patterns in 2026",
		ArticleURL:        "http://localhost:3000/article/go-concurrency",
		CommentSnippet:    "Excellent breakdown of fan-out pipeline patterns!",
	})
	assert.NoError(t, err)
	assert.Contains(t, res.Subject, "New comment from @gopher")
	assert.Contains(t, res.HTMLBody, "fan-out pipeline patterns")
}

func TestMockSender(t *testing.T) {
	sender := NewMockSender()
	res, err := sender.Send(context.Background(), Message{
		ToEmail:   "test@quorix.io",
		Subject:   "Unit Test Message",
		HTMLBody:  "<p>Hello World</p>",
		TextBody:  "Hello World",
		FromEmail: "noreply@quorix.io",
	})

	assert.NoError(t, err)
	assert.NotEmpty(t, res.MessageID)
	assert.Equal(t, "mock", res.Provider)
}

func TestEmailService_OutboxAndWorkerProcessing(t *testing.T) {
	dbPool, queries, cfg := setupTestDB(t)
	defer dbPool.Close()

	ctx := context.Background()
	svc := NewService(cfg, dbPool, queries)
	mockSender := NewMockSender()
	worker := NewWorker(cfg, dbPool, queries, mockSender)

	testEmail := "worker_test_" + uuid.New().String()[:8] + "@quorix.io"

	// 1. Enqueue email
	outboxItem, err := svc.Enqueue(ctx, testEmail, "Test Engineer", TemplateWelcome, WelcomeData{
		BaseEmailData: BaseEmailData{PlatformURL: "http://localhost:3000"},
		Username:      "testeng",
		DisplayName:   "Test Engineer",
		ProfileURL:    "http://localhost:3000/author/testeng",
	})
	require.NoError(t, err)
	require.NotNil(t, outboxItem)
	assert.Equal(t, testEmail, outboxItem.RecipientEmail)
	assert.Equal(t, "pending", outboxItem.Status)

	// 2. Process batch with worker
	processed, err := worker.ProcessBatch(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, processed, 1)

	// 3. Verify outbox item was marked 'sent' with ses_message_id
	var updatedItem db.EmailOutbox
	err = dbPool.Pool.QueryRow(ctx, "SELECT id, status, ses_message_id, retry_count FROM email_outbox WHERE id = $1", outboxItem.ID).
		Scan(&updatedItem.ID, &updatedItem.Status, &updatedItem.SesMessageID, &updatedItem.RetryCount)
	require.NoError(t, err)
	assert.Equal(t, "sent", updatedItem.Status)
	assert.True(t, updatedItem.SesMessageID.Valid)
	assert.Contains(t, updatedItem.SesMessageID.String, "mock-ses-")

	// 4. Verify email_logs audit trail was written
	logs, err := queries.GetEmailLogsByOutboxID(ctx, outboxItem.ID)
	require.NoError(t, err)
	require.Len(t, logs, 1)
	assert.Equal(t, "sent", logs[0].Status)
	assert.Equal(t, testEmail, logs[0].RecipientEmail)
	assert.Equal(t, int32(1), logs[0].AttemptNumber)
}

type FailingSender struct{}

func (f *FailingSender) Send(ctx context.Context, msg Message) (*SendResult, error) {
	return nil, errors.New("simulated SES network timeout")
}

func TestEmailWorker_RetryHandling(t *testing.T) {
	dbPool, queries, cfg := setupTestDB(t)
	defer dbPool.Close()

	ctx := context.Background()
	svc := NewService(cfg, dbPool, queries)
	failingSender := &FailingSender{}
	worker := NewWorker(cfg, dbPool, queries, failingSender)

	testEmail := "fail_test_" + uuid.New().String()[:8] + "@quorix.io"

	// 1. Enqueue email
	outboxItem, err := svc.Enqueue(ctx, testEmail, "Fail User", TemplateWelcome, WelcomeData{
		BaseEmailData: BaseEmailData{PlatformURL: "http://localhost:3000"},
		Username:      "failuser",
		DisplayName:   "Fail User",
	})
	require.NoError(t, err)

	// 2. Process batch with failing sender
	processed, err := worker.ProcessBatch(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, processed, 1)

	// 3. Check retry count and status in outbox
	var failedItem db.EmailOutbox
	err = dbPool.Pool.QueryRow(ctx, "SELECT id, status, retry_count, last_error FROM email_outbox WHERE id = $1", outboxItem.ID).
		Scan(&failedItem.ID, &failedItem.Status, &failedItem.RetryCount, &failedItem.LastError)
	require.NoError(t, err)
	assert.Equal(t, int32(1), failedItem.RetryCount)
	assert.Equal(t, "pending", failedItem.Status) // still pending next retry
	assert.Contains(t, failedItem.LastError.String, "simulated SES network timeout")

	// 4. Check email_logs for failure entry
	logs, err := queries.GetEmailLogsByOutboxID(ctx, outboxItem.ID)
	require.NoError(t, err)
	require.Len(t, logs, 1)
	assert.Equal(t, "failed", logs[0].Status)
	assert.Contains(t, logs[0].ErrorMessage.String, "simulated SES network timeout")
}

func TestNotificationPreferences_Lifecycle(t *testing.T) {
	dbPool, queries, cfg := setupTestDB(t)
	defer dbPool.Close()

	ctx := context.Background()
	svc := NewService(cfg, dbPool, queries)

	// Create test user for foreign key
	userEmail := "pref_user_" + uuid.New().String()[:8] + "@quorix.io"
	user, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:        userEmail,
		PasswordHash: "dummyhash",
		Role:         "user",
		Status:       "active",
	})
	require.NoError(t, err)
	userUUID := uuid.UUID(user.ID.Bytes)

	// 1. Get default preferences
	prefs, err := svc.GetPreferences(ctx, userUUID)
	require.NoError(t, err)
	assert.True(t, prefs.EmailOnNewFollower)
	assert.True(t, prefs.EmailOnNewComment)

	// 2. Update preferences: disable new follower emails
	updated, err := svc.UpdatePreferences(ctx, userUUID, UpdatePreferencesInput{
		EmailOnNewFollower:    false,
		EmailOnNewComment:     true,
		EmailOnReply:          false,
		EmailOnArticlePublish: true,
	})
	require.NoError(t, err)
	assert.False(t, updated.EmailOnNewFollower)
	assert.False(t, updated.EmailOnReply)
	assert.True(t, updated.EmailOnNewComment)

	// 3. EnqueueWithPreferenceCheck for new_follower -> Should be skipped!
	skippedItem, err := svc.EnqueueWithPreferenceCheck(ctx, userUUID, userEmail, "Pref User", TemplateNewFollower, NewFollowerData{
		BaseEmailData:    BaseEmailData{PlatformURL: "http://localhost:3000"},
		AuthorUsername:   "prefuser",
		FollowerUsername: "fellowdev",
		FollowerName:     "Fellow Dev",
		FollowerProfile:  "http://localhost:3000/author/fellowdev",
	})
	assert.NoError(t, err)
	assert.Nil(t, skippedItem) // Skipped as expected!

	// 4. EnqueueWithPreferenceCheck for new_comment -> Should be enqueued!
	enqueuedItem, err := svc.EnqueueWithPreferenceCheck(ctx, userUUID, userEmail, "Pref User", TemplateNewComment, NewCommentData{
		BaseEmailData:     BaseEmailData{PlatformURL: "http://localhost:3000"},
		AuthorUsername:    "prefuser",
		CommenterUsername: "fellowdev",
		ArticleTitle:      "Microservices vs Modular Monolith",
		ArticleURL:        "http://localhost:3000/article/monolith",
		CommentSnippet:    "Very informative piece!",
	})
	assert.NoError(t, err)
	assert.NotNil(t, enqueuedItem) // Enqueued as expected!
	assert.Equal(t, userEmail, enqueuedItem.RecipientEmail)
}
