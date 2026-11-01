package operations

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes sets up operational health checks, readiness probes, and telemetry management routes.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Public Root Probes
	r.GET("/health", h.Liveness)
	r.GET("/ready", h.Readiness)

	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// Protected Admin Operations
	adminOps := r.Group("/admin/operations")
	adminOps.Use(authMW, middleware.RequireRole("admin"))
	{
		adminOps.GET("/health", h.GetSystemHealth)
		adminOps.GET("/failed-jobs", h.ListFailedJobs)
		adminOps.POST("/retry-job/:id", h.RetryJob)
		adminOps.POST("/retry-all-jobs", h.RetryAllJobs)
	}
}
