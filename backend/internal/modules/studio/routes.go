package studio

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all author studio endpoints.
// All studio actions require authentication and at least author role.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	studio := r.Group("/studio")
	studio.Use(middleware.Authenticate(cfg.JWT.AccessSecret), middleware.RequireRole("author"))
	{
		studio.GET("/overview", h.GetOverview)
		studio.POST("/articles", h.CreateArticle)
		studio.GET("/articles", h.ListArticles)
		studio.GET("/articles/:id", h.GetArticle)
		studio.PUT("/articles/:id", h.UpdateArticle)
		studio.DELETE("/articles/:id", h.DeleteArticle)
		studio.POST("/articles/:id/publish", h.PublishArticle)
		studio.POST("/articles/:id/archive", h.ArchiveArticle)
	}
}

