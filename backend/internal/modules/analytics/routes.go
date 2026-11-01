package analytics

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all analytics collection and telemetry dashboard endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Public event collector (with optional auth to capture authenticated user ID)
	r.POST("/analytics/collect", middleware.OptionalAuthenticate(cfg.JWT.AccessSecret), h.CollectEvent)

	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// Platform-wide analytics (Staff & Super Admin)
	admin := r.Group("/admin/analytics")
	admin.Use(authMW, middleware.RequireRole("admin"))
	{
		admin.GET("", h.GetPlatformAnalytics)
	}

	// Author-isolated analytics (Author Studio)
	studio := r.Group("/studio/analytics")
	studio.Use(authMW, middleware.RequireRole("author"))
	{
		studio.GET("", h.GetAuthorAnalytics)
	}
}

