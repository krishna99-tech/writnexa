package search

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers all search and discovery endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler) {
	search := r.Group("/search")
	{
		search.GET("", h.GlobalSearch)
		search.GET("/authors", h.SearchAuthors)
	}

	// Discovery endpoints
	articles := r.Group("/articles")
	{
		articles.GET("/popular", h.ListPopular)
	}
}

