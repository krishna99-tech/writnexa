package content

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all content and author endpoints.
// Public endpoints are accessible without authentication.
// Profile management endpoints require authentication.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Articles
	r.GET("/articles", h.ListArticles)
	r.GET("/articles/featured", h.ListFeatured)
	r.GET("/articles/trending", h.ListTrending)
	r.GET("/articles/:slug", h.GetArticle)

	// Topics / Categories
	r.GET("/categories", h.ListCategories)
	r.GET("/categories/:slug", h.GetCategory)

	// Tags
	r.GET("/tags", h.ListTags)
	r.GET("/tags/:slug", h.GetTag)

	// Authors (Public)
	r.GET("/authors", h.ListAuthors)
	r.GET("/authors/:username", h.GetAuthor)
	r.GET("/authors/:username/articles", h.ListAuthorArticles)
	r.GET("/authors/:username/stats", h.GetAuthorStats)

	// Authors (Protected Profile Management)
	protected := r.Group("/authors")
	protected.Use(middleware.Authenticate(cfg.JWT.AccessSecret))
	{
		protected.GET("/me", h.GetMyProfile)
		protected.PUT("/me", h.UpdateMyProfile)
	}
}

