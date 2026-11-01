package search

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// GlobalSearch handles GET /api/v1/search
func (h *Handler) GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	searchType := c.DefaultQuery("type", "all")
	categorySlug := c.Query("category")
	tagSlug := c.Query("tag")
	sortBy := c.Query("sort")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	result, err := h.svc.GlobalSearch(c.Request.Context(), query, searchType, categorySlug, tagSlug, sortBy, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SEARCH_FAILED", err.Error())
		return
	}

	totalPages := 0
	if searchType == "authors" {
		totalPages = int((result.AuthorsTotal + int64(perPage) - 1) / int64(perPage))
	} else {
		totalPages = int((result.ArticlesTotal + int64(perPage) - 1) / int64(perPage))
	}

	response.JSON(c, http.StatusOK, gin.H{
		"query":          result.Query,
		"type":           result.Type,
		"articles":       result.Articles,
		"authors":        result.Authors,
		"articles_total": result.ArticlesTotal,
		"authors_total":  result.AuthorsTotal,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_pages":   totalPages,
			"articles_total": result.ArticlesTotal,
			"authors_total":  result.AuthorsTotal,
		},
	})
}

// SearchAuthors handles GET /api/v1/search/authors
func (h *Handler) SearchAuthors(c *gin.Context) {
	query := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "12"))

	authors, total, err := h.svc.SearchAuthors(c.Request.Context(), query, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SEARCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"authors": authors,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
		},
	})
}

// ListPopular handles GET /api/v1/articles/popular
func (h *Handler) ListPopular(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	articles, err := h.svc.ListPopularArticles(c.Request.Context(), limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"articles": articles,
		"count":    len(articles),
	})
}

