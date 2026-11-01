package studio

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// CreateArticle handles POST /api/v1/studio/articles
func (h *Handler) CreateArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req CreateArticleInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	article, err := h.svc.CreateArticle(c.Request.Context(), authorID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidTitle):
			response.Error(c, http.StatusBadRequest, "INVALID_TITLE", err.Error())
		case errors.Is(err, ErrInvalidSlug):
			response.Error(c, http.StatusBadRequest, "INVALID_SLUG", err.Error())
		case errors.Is(err, ErrSlugTaken):
			response.Error(c, http.StatusConflict, "SLUG_TAKEN", err.Error())
		case errors.Is(err, ErrInvalidContent):
			response.Error(c, http.StatusBadRequest, "INVALID_CONTENT", err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "CREATION_FAILED", err.Error())
		}
		return
	}

	response.JSON(c, http.StatusCreated, gin.H{
		"message": "Article draft created successfully",
		"article": article,
	})
}

// UpdateArticle handles PUT /api/v1/studio/articles/:id
func (h *Handler) UpdateArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	var req UpdateArticleInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	article, err := h.svc.UpdateArticle(c.Request.Context(), authorID, articleID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrArticleNotFound):
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found or not owned by author")
		case errors.Is(err, ErrInvalidTitle):
			response.Error(c, http.StatusBadRequest, "INVALID_TITLE", err.Error())
		case errors.Is(err, ErrInvalidSlug):
			response.Error(c, http.StatusBadRequest, "INVALID_SLUG", err.Error())
		case errors.Is(err, ErrSlugTaken):
			response.Error(c, http.StatusConflict, "SLUG_TAKEN", err.Error())
		case errors.Is(err, ErrInvalidContent):
			response.Error(c, http.StatusBadRequest, "INVALID_CONTENT", err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		}
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article updated successfully",
		"article": article,
	})
}

// GetArticle handles GET /api/v1/studio/articles/:id
func (h *Handler) GetArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	article, err := h.svc.GetArticle(c.Request.Context(), authorID, articleID)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found or not owned by author")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"article": article,
	})
}

// ListArticles handles GET /api/v1/studio/articles
func (h *Handler) ListArticles(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	status := c.DefaultQuery("status", "all")
	search := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	articles, total, err := h.svc.ListArticles(c.Request.Context(), authorID, status, search, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"articles": articles,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
			"status":        status,
		},
	})
}

// PublishArticle handles POST /api/v1/studio/articles/:id/publish
func (h *Handler) PublishArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	article, err := h.svc.PublishArticle(c.Request.Context(), authorID, articleID)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found or not owned by author")
			return
		}
		response.Error(c, http.StatusInternalServerError, "PUBLISH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article published successfully and is now live on QUORIX!",
		"article": article,
	})
}

// ArchiveArticle handles POST /api/v1/studio/articles/:id/archive
func (h *Handler) ArchiveArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	article, err := h.svc.ArchiveArticle(c.Request.Context(), authorID, articleID)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found or not owned by author")
			return
		}
		response.Error(c, http.StatusInternalServerError, "ARCHIVE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article archived successfully",
		"article": article,
	})
}

// DeleteArticle handles DELETE /api/v1/studio/articles/:id
func (h *Handler) DeleteArticle(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	if err := h.svc.DeleteArticle(c.Request.Context(), authorID, articleID); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article deleted successfully",
	})
}

// GetOverview handles GET /api/v1/studio/overview
func (h *Handler) GetOverview(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	overview, err := h.svc.GetOverview(c.Request.Context(), authorID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"overview": overview,
	})
}

func getContextUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(middleware.ContextUserID)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return uuid.Nil, false
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		response.Error(c, http.StatusInternalServerError, "INVALID_CONTEXT", "Invalid user context")
		return uuid.Nil, false
	}
	return userID, true
}

