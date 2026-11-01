package content

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers all public content explorer endpoints.
// These are completely public — visitors do NOT need to authenticate to read.
func RegisterRoutes(r *gin.RouterGroup, h *Handler) {
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

	// Authors
	r.GET("/authors", h.ListAuthors)
	r.GET("/authors/:username", h.GetAuthor)
	r.GET("/authors/:username/articles", h.ListAuthorArticles)
}
