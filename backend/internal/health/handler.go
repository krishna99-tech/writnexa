package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/database"
	"github.com/quorix/quorix-backend/internal/redis"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	db        *database.DB
	redis     *redis.Client
	startTime time.Time
	version   string
}

func NewHandler(db *database.DB, redis *redis.Client, version string) *Handler {
	return &Handler{
		db:        db,
		redis:     redis,
		startTime: time.Now(),
		version:   version,
	}
}

type ServiceStatus struct {
	Status   string `json:"status"` // "connected", "disconnected", "disabled"
	Error    string `json:"error,omitempty"`
	Latency  string `json:"latency,omitempty"`
}

type HealthData struct {
	Status        string                   `json:"status"` // "healthy", "degraded"
	Version       string                   `json:"version"`
	UptimeSeconds float64                  `json:"uptime_seconds"`
	Timestamp     time.Time                `json:"timestamp"`
	Services      map[string]ServiceStatus `json:"services"`
}

// Check handles GET /health and GET /api/v1/health.
func (h *Handler) Check(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	services := make(map[string]ServiceStatus)
	isHealthy := true

	// Check PostgreSQL
	if h.db != nil && h.db.Pool != nil {
		dbStart := time.Now()
		if err := h.db.Ping(ctx); err != nil {
			services["database"] = ServiceStatus{
				Status: "disconnected",
				Error:  err.Error(),
			}
			isHealthy = false
		} else {
			services["database"] = ServiceStatus{
				Status:  "connected",
				Latency: time.Since(dbStart).String(),
			}
		}
	} else {
		services["database"] = ServiceStatus{
			Status: "not_configured",
		}
		isHealthy = false
	}

	// Check Redis
	if h.redis != nil && h.redis.Enabled && h.redis.RDB != nil {
		redisStart := time.Now()
		if err := h.redis.Ping(ctx); err != nil {
			services["redis"] = ServiceStatus{
				Status: "disconnected",
				Error:  err.Error(),
			}
			// Note: Redis degradation may not completely block platform read flows
		} else {
			services["redis"] = ServiceStatus{
				Status:  "connected",
				Latency: time.Since(redisStart).String(),
			}
		}
	} else {
		services["redis"] = ServiceStatus{
			Status: "disabled",
		}
	}

	overallStatus := "healthy"
	httpStatus := http.StatusOK
	if !isHealthy {
		overallStatus = "degraded"
	}

	response.JSON(c, httpStatus, HealthData{
		Status:        overallStatus,
		Version:       h.version,
		UptimeSeconds: time.Since(h.startTime).Seconds(),
		Timestamp:     time.Now().UTC(),
		Services:      services,
	})
}

