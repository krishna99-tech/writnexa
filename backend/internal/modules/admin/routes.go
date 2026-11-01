package admin

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all super admin, moderation, and administrative audit routes.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// User content reporting (Authenticated users can flag inappropriate content)
	r.POST("/reports", authMW, h.CreateModerationReport)

	// Protected Admin Center
	admin := r.Group("/admin")
	admin.Use(authMW)
	{
		// Moderator & Admin access (Moderation Queue)
		mod := admin.Group("")
		mod.Use(middleware.RequireRole("moderator"))
		{
			mod.GET("/reports", h.ListModerationReports)
			mod.POST("/reports/:id/resolve", h.ResolveModerationReport)
			mod.POST("/articles/:id/archive", h.ArchiveArticle)
		}

		// Full Admin & Super Admin access
		fullAdmin := admin.Group("")
		fullAdmin.Use(middleware.RequireRole("admin"))
		{
			// Dashboard KPIs & Analytics
			fullAdmin.GET("/dashboard", h.GetDashboardStats)

			// User Management
			fullAdmin.GET("/users", h.ListUsers)
			fullAdmin.GET("/users/:id", h.GetUserDetail)
			fullAdmin.PUT("/users/:id/status", h.UpdateUserStatus)
			fullAdmin.PUT("/users/:id/role", h.UpdateUserRole)

			// Content Management
			fullAdmin.GET("/articles", h.ListArticles)
			fullAdmin.POST("/articles/:id/feature", h.ToggleFeatureArticle)

			// Audit Logs
			fullAdmin.GET("/audit-logs", h.ListAuditLogs)

			// Platform Settings
			fullAdmin.GET("/settings", h.ListPlatformSettings)
			fullAdmin.PUT("/settings/:key", h.UpdatePlatformSetting)
		}
	}
}

