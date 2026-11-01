package operations

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/quorix/quorix-backend/internal/redis"
)

var processStartTime = time.Now()

type RuntimeMetrics struct {
	UptimeSeconds float64 `json:"uptime_seconds"`
	GoVersion     string  `json:"go_version"`
	OS            string  `json:"os"`
	Arch          string  `json:"arch"`
	NumCPU        int     `json:"num_cpu"`
	NumGoroutines int     `json:"num_goroutines"`
	AllocMB       float64 `json:"alloc_mb"`
	TotalAllocMB  float64 `json:"total_alloc_mb"`
	SysMB         float64 `json:"sys_mb"`
	HeapAllocMB   float64 `json:"heap_alloc_mb"`
	NumGC         uint32  `json:"num_gc"`
}

type DatabaseMetrics struct {
	Status         string           `json:"status"`
	PingLatencyMs  float64          `json:"ping_latency_ms"`
	TotalConns     int32            `json:"total_conns"`
	IdleConns      int32            `json:"idle_conns"`
	AcquiredConns  int32            `json:"acquired_conns"`
	MaxConns       int32            `json:"max_conns"`
	DatabaseSize   string           `json:"database_size"`
	DatabaseBytes  int64            `json:"database_bytes"`
	TopTableSizes  []TableSizeEntry `json:"top_table_sizes"`
}

type TableSizeEntry struct {
	TableName   string `json:"table_name"`
	TotalSize   string `json:"total_size"`
	TotalBytes  int64  `json:"total_bytes"`
	RowEstimate int64  `json:"row_estimate"`
}

type RedisMetrics struct {
	Status        string  `json:"status"`
	PingLatencyMs float64 `json:"ping_latency_ms"`
	Enabled       bool    `json:"enabled"`
}

type WorkerMetrics struct {
	WorkerStatus string `json:"worker_status"` // running, idle
	SESMode      string `json:"ses_mode"`      // dev_mock, smtp_relay, api
	Pending      int64  `json:"pending"`
	Sending      int64  `json:"sending"`
	Sent         int64  `json:"sent"`
	Failed       int64  `json:"failed"`
	Total        int64  `json:"total"`
}

type StorageMetrics struct {
	Provider string `json:"provider"` // AWS S3, Local Mock Storage
	Status   string `json:"status"`   // operational, not_configured
	Bucket   string `json:"bucket"`
	Region   string `json:"region"`
}

type SystemHealthOverview struct {
	OverallStatus string                   `json:"overall_status"` // healthy, degraded, critical
	Timestamp     time.Time                `json:"timestamp"`
	Runtime       RuntimeMetrics           `json:"runtime"`
	Database      DatabaseMetrics          `json:"database"`
	Redis         RedisMetrics             `json:"redis"`
	Workers       WorkerMetrics            `json:"workers"`
	Storage       StorageMetrics           `json:"storage"`
	APITelemetry  middleware.APITelemetry  `json:"api_telemetry"`
}

type FailedJobItem struct {
	ID             string    `json:"id"`
	RecipientEmail string    `json:"recipient_email"`
	TemplateName   string    `json:"template_name"`
	Subject        string    `json:"subject"`
	Status         string    `json:"status"`
	RetryCount     int32     `json:"retry_count"`
	MaxRetries     int32     `json:"max_retries"`
	LastError      string    `json:"last_error"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Service interface {
	GetLiveness(ctx context.Context) bool
	GetReadiness(ctx context.Context) (bool, map[string]string)
	GetSystemHealth(ctx context.Context) (*SystemHealthOverview, error)
	ListFailedJobs(ctx context.Context, limit, offset int32) ([]FailedJobItem, error)
	RetryFailedJob(ctx context.Context, id uuid.UUID) (*db.EmailOutbox, error)
	RetryAllFailedJobs(ctx context.Context) error
}

type service struct {
	db    *database.DB
	q     *db.Queries
	redis *redis.Client
}

func NewService(db *database.DB, q *db.Queries, redis *redis.Client) Service {
	return &service{
		db:    db,
		q:     q,
		redis: redis,
	}
}

func (s *service) GetLiveness(ctx context.Context) bool {
	return true
}

func (s *service) GetReadiness(ctx context.Context) (bool, map[string]string) {
	checks := make(map[string]string)
	isReady := true

	// Check Database
	if s.db != nil && s.db.Pool != nil {
		ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		if err := s.db.Ping(ctxTimeout); err != nil {
			checks["database"] = fmt.Sprintf("unhealthy: %v", err)
			isReady = false
		} else {
			checks["database"] = "ready"
		}
	} else {
		checks["database"] = "not_configured"
		isReady = false
	}

	// Check Redis (optional soft degradation)
	if s.redis != nil && s.redis.Enabled && s.redis.RDB != nil {
		ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		if err := s.redis.Ping(ctxTimeout); err != nil {
			checks["redis"] = fmt.Sprintf("degraded: %v", err)
		} else {
			checks["redis"] = "ready"
		}
	} else {
		checks["redis"] = "disabled"
	}

	return isReady, checks
}

func (s *service) GetSystemHealth(ctx context.Context) (*SystemHealthOverview, error) {
	// 1. Runtime Telemetry
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	uptime := time.Since(processStartTime).Seconds()
	runtimeMet := RuntimeMetrics{
		UptimeSeconds: uptime,
		GoVersion:     runtime.Version(),
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		NumCPU:        runtime.NumCPU(),
		NumGoroutines: runtime.NumGoroutine(),
		AllocMB:       float64(mem.Alloc) / 1024 / 1024,
		TotalAllocMB:  float64(mem.TotalAlloc) / 1024 / 1024,
		SysMB:         float64(mem.Sys) / 1024 / 1024,
		HeapAllocMB:   float64(mem.HeapAlloc) / 1024 / 1024,
		NumGC:         mem.NumGC,
	}

	// 2. Database Telemetry
	dbMet := DatabaseMetrics{
		Status: "disconnected",
	}
	isDbHealthy := false
	if s.db != nil && s.db.Pool != nil {
		stat := s.db.Pool.Stat()
		dbMet.TotalConns = stat.TotalConns()
		dbMet.IdleConns = stat.IdleConns()
		dbMet.AcquiredConns = stat.AcquiredConns()
		dbMet.MaxConns = stat.MaxConns()

		dbStart := time.Now()
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err := s.db.Ping(pingCtx)
		cancel()

		if err == nil {
			dbMet.Status = "connected"
			dbMet.PingLatencyMs = float64(time.Since(dbStart).Microseconds()) / 1000.0
			isDbHealthy = true

			// Query DB storage size & top tables
			var totalSize string
			var totalBytes int64
			_ = s.db.Pool.QueryRow(ctx, "SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database())").Scan(&totalSize, &totalBytes)
			dbMet.DatabaseSize = totalSize
			dbMet.DatabaseBytes = totalBytes

			rows, err := s.db.Pool.Query(ctx, `
				SELECT 
					c.relname::text,
					pg_total_relation_size(c.oid)::bigint,
					pg_size_pretty(pg_total_relation_size(c.oid))::text,
					c.reltuples::bigint
				FROM pg_class c
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE n.nspname = 'public' AND c.relkind = 'r'
				ORDER BY pg_total_relation_size(c.oid) DESC
				LIMIT 10;
			`)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var entry TableSizeEntry
					if err := rows.Scan(&entry.TableName, &entry.TotalBytes, &entry.TotalSize, &entry.RowEstimate); err == nil {
						dbMet.TopTableSizes = append(dbMet.TopTableSizes, entry)
					}
				}
			}
		} else {
			dbMet.Status = "error"
		}
	}

	// 3. Redis Telemetry
	redisMet := RedisMetrics{
		Status:  "disabled",
		Enabled: false,
	}
	if s.redis != nil && s.redis.Enabled && s.redis.RDB != nil {
		redisMet.Enabled = true
		rStart := time.Now()
		rCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err := s.redis.Ping(rCtx)
		cancel()

		if err == nil {
			redisMet.Status = "connected"
			redisMet.PingLatencyMs = float64(time.Since(rStart).Microseconds()) / 1000.0
		} else {
			redisMet.Status = "error"
		}
	}

	// 4. Background Workers & Email Outbox
	workerMet := WorkerMetrics{
		WorkerStatus: "running",
		SESMode:      "dev_mock",
	}
	if os.Getenv("AWS_SES_SMTP_USER") != "" {
		workerMet.SESMode = "smtp_relay"
	} else if os.Getenv("AWS_REGION") != "" && os.Getenv("AWS_SECRET_ACCESS_KEY") != "" {
		workerMet.SESMode = "aws_sdk_v2"
	}

	outboxStats, err := s.q.GetEmailOutboxStats(ctx)
	if err == nil {
		workerMet.Pending = outboxStats.PendingCount
		workerMet.Sending = outboxStats.SendingCount
		workerMet.Sent = outboxStats.SentCount
		workerMet.Failed = outboxStats.FailedCount
		workerMet.Total = outboxStats.TotalCount
	}

	// 5. Storage (S3 / Blob)
	storageMet := StorageMetrics{
		Provider: "Local Content Storage",
		Status:   "operational",
		Bucket:   os.Getenv("S3_BUCKET_NAME"),
		Region:   os.Getenv("AWS_REGION"),
	}
	if storageMet.Bucket != "" {
		storageMet.Provider = "AWS S3 Multi-Region"
	}

	// 6. Overall Status determination
	overallStatus := "healthy"
	if !isDbHealthy {
		overallStatus = "critical"
	} else if workerMet.Failed > 50 || (redisMet.Enabled && redisMet.Status == "error") {
		overallStatus = "degraded"
	}

	apiTele := middleware.GetGlobalMetrics().Snapshot()

	return &SystemHealthOverview{
		OverallStatus: overallStatus,
		Timestamp:     time.Now().UTC(),
		Runtime:       runtimeMet,
		Database:      dbMet,
		Redis:         redisMet,
		Workers:       workerMet,
		Storage:       storageMet,
		APITelemetry:  apiTele,
	}, nil
}

func (s *service) ListFailedJobs(ctx context.Context, limit, offset int32) ([]FailedJobItem, error) {
	if limit <= 0 {
		limit = 25
	}

	rows, err := s.q.ListFailedEmailJobs(ctx, db.ListFailedEmailJobsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}

	var items []FailedJobItem
	for _, r := range rows {
		lastErr := ""
		if r.LastError.Valid {
			lastErr = r.LastError.String
		}
		items = append(items, FailedJobItem{
			ID:             uuid.UUID(r.ID.Bytes).String(),
			RecipientEmail: r.RecipientEmail,
			TemplateName:   r.TemplateName,
			Subject:        r.Subject,
			Status:         r.Status,
			RetryCount:     r.RetryCount,
			MaxRetries:     r.MaxRetries,
			LastError:      lastErr,
			CreatedAt:      r.CreatedAt.Time,
			UpdatedAt:      r.UpdatedAt.Time,
		})
	}
	return items, nil
}

func (s *service) RetryFailedJob(ctx context.Context, id uuid.UUID) (*db.EmailOutbox, error) {
	res, err := s.q.RetryFailedEmailJob(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (s *service) RetryAllFailedJobs(ctx context.Context) error {
	return s.q.RetryAllFailedEmailJobs(ctx)
}
