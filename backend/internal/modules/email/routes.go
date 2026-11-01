package email

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers the notification preferences endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	notifications := r.Group("/notifications")
	notifications.Use(middleware.Authenticate(cfg.JWT.AccessSecret))
	{
		notifications.GET("/preferences", h.GetPreferences)
		notifications.PUT("/preferences", h.UpdatePreferences)
	}
}

