package operations

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestOps(t *testing.T) (*database.DB, *db.Queries, Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	q := db.New(pool.Pool)
	svc := NewService(pool, q, nil)

	t.Cleanup(func() {
		pool.Close()
	})

	return pool, q, svc
}

func TestOperations_LivenessAndReadiness(t *testing.T) {
	_, _, svc := setupTestOps(t)
	ctx := context.Background()

	// 1. Liveness check
	isAlive := svc.GetLiveness(ctx)
	assert.True(t, isAlive)

	// 2. Readiness check
	isReady, checks := svc.GetReadiness(ctx)
	assert.True(t, isReady)
	assert.Equal(t, "ready", checks["database"])
}

func TestOperations_SystemHealthMetrics(t *testing.T) {
	_, _, svc := setupTestOps(t)
	ctx := context.Background()

	health, err := svc.GetSystemHealth(ctx)
	require.NoError(t, err)

	// Runtime verification
	assert.NotEmpty(t, health.Runtime.GoVersion)
	assert.Greater(t, health.Runtime.NumCPU, 0)
	assert.Greater(t, health.Runtime.NumGoroutines, 0)
	assert.Greater(t, health.Runtime.AllocMB, 0.0)

	// Database verification
	assert.Equal(t, "connected", health.Database.Status)
	assert.Greater(t, health.Database.TotalConns, int32(0))
	assert.NotEmpty(t, health.Database.DatabaseSize)
	assert.NotEmpty(t, health.Database.TopTableSizes)

	// Worker & Storage
	assert.Equal(t, "running", health.Workers.WorkerStatus)
	assert.NotEmpty(t, health.Storage.Status)

	// Overall Status
	assert.Equal(t, "healthy", health.OverallStatus)
}

func TestOperations_APITelemetryMetrics(t *testing.T) {
	tracker := middleware.NewMetricsTracker(100)

	// Record simulated requests
	tracker.Record(200, 10*time.Millisecond)
	tracker.Record(200, 15*time.Millisecond)
	tracker.Record(204, 8*time.Millisecond)
	tracker.Record(404, 5*time.Millisecond)
	tracker.Record(500, 50*time.Millisecond)

	snapshot := tracker.Snapshot()

	assert.Equal(t, uint64(5), snapshot.TotalRequests)
	assert.Equal(t, uint64(3), snapshot.Status2xx)
	assert.Equal(t, uint64(1), snapshot.Status4xx)
	assert.Equal(t, uint64(1), snapshot.Status5xx)
	assert.Equal(t, 20.0, snapshot.ErrorRatePercent) // 1 out of 5 is 20%
	assert.Greater(t, snapshot.AvgLatencyMs, 0.0)
	assert.GreaterOrEqual(t, snapshot.P95LatencyMs, snapshot.P50LatencyMs)
}

func TestOperations_FailedJobRetryAndRecovery(t *testing.T) {
	pool, _, svc := setupTestOps(t)
	ctx := context.Background()

	// 1. Enqueue a failed email job to simulate an unrecoverable worker failure
	jobID := uuid.New()
	_, err := pool.Pool.Exec(ctx, `
		INSERT INTO email_outbox (
			id, recipient_email, recipient_name, template_name, subject, html_body, text_body, status, retry_count, max_retries, last_error
		) VALUES (
			$1, 'failure_recovery_test@quorix.io', 'Test User', 'welcome', 'Welcome Test', '<h1>Welcome</h1>', 'Welcome', 'failed', 3, 3, 'SES Network Timeout after 3 attempts'
		)
	`, jobID)
	require.NoError(t, err)

	// 2. List failed jobs
	failedList, err := svc.ListFailedJobs(ctx, 10, 0)
	require.NoError(t, err)
	require.NotEmpty(t, failedList)

	found := false
	for _, job := range failedList {
		if job.ID == jobID.String() {
			found = true
			assert.Equal(t, "failed", job.Status)
			assert.Equal(t, int32(3), job.RetryCount)
			assert.Contains(t, job.LastError, "SES Network Timeout")
			break
		}
	}
	assert.True(t, found, "Newly seeded failed job must appear in failed jobs list")

	// 3. Retry the failed job
	recoveredJob, err := svc.RetryFailedJob(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, "pending", recoveredJob.Status)
	assert.Equal(t, int32(0), recoveredJob.RetryCount)
	assert.False(t, recoveredJob.LastError.Valid)

	// 4. Test bulk retry recovery
	// Create another failed job
	anotherID := uuid.New()
	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO email_outbox (
			id, recipient_email, recipient_name, template_name, subject, html_body, text_body, status, retry_count, max_retries, last_error
		) VALUES (
			$1, 'bulk_recovery_test@quorix.io', 'Bulk User', 'welcome', 'Bulk Test', '<h1>Bulk</h1>', 'Bulk', 'failed', 3, 3, 'Simulated rate limit'
		)
	`, anotherID)
	require.NoError(t, err)

	err = svc.RetryAllFailedJobs(ctx)
	require.NoError(t, err)

	// Verify no jobs remain in failed status
	remainingFailed, err := svc.ListFailedJobs(ctx, 10, 0)
	require.NoError(t, err)
	for _, job := range remainingFailed {
		assert.NotEqual(t, anotherID.String(), job.ID)
	}
}
