package content

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

// ListArticles handles GET /api/v1/articles
func (h *Handler) ListArticles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	sort := c.DefaultQuery("sort", "latest")
	category := c.Query("category")
	tag := c.Query("tag")
	search := c.Query("q")

	if search != "" {
		articles, total, err := h.svc.SearchArticles(c.Request.Context(), search, page, perPage)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "SEARCH_FAILED", err.Error())
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
			},
		})
		return
	}

	articles, total, err := h.svc.ListPublishedArticles(c.Request.Context(), page, perPage, sort, category, tag)
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
		},
	})
}

// GetArticle handles GET /api/v1/articles/:slug
func (h *Handler) GetArticle(c *gin.Context) {
	slug := c.Param("slug")
	article, err := h.svc.GetArticleBySlug(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "ARTICLE_NOT_FOUND", "Article not found or not published.")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"article": article,
	})
}

// ListFeatured handles GET /api/v1/articles/featured
func (h *Handler) ListFeatured(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	articles, err := h.svc.ListFeaturedArticles(c.Request.Context(), limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"articles": articles,
	})
}

// ListTrending handles GET /api/v1/articles/trending
func (h *Handler) ListTrending(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	articles, err := h.svc.ListTrendingArticles(c.Request.Context(), limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"articles": articles,
	})
}

// ListCategories handles GET /api/v1/categories
func (h *Handler) ListCategories(c *gin.Context) {
	cats, err := h.svc.ListCategories(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"categories": cats,
	})
}

// GetCategory handles GET /api/v1/categories/:slug
func (h *Handler) GetCategory(c *gin.Context) {
	slug := c.Param("slug")
	cat, err := h.svc.GetCategoryBySlug(c.Request.Context(), slug)
	if err != nil {
		response.Error(c, http.StatusNotFound, "CATEGORY_NOT_FOUND", "Category not found.")
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"category": cat,
	})
}

// ListTags handles GET /api/v1/tags
func (h *Handler) ListTags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	tags, err := h.svc.ListTags(c.Request.Context(), limit, offset)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"tags": tags,
	})
}

// GetTag handles GET /api/v1/tags/:slug
func (h *Handler) GetTag(c *gin.Context) {
	slug := c.Param("slug")
	tag, err := h.svc.GetTagBySlug(c.Request.Context(), slug)
	if err != nil {
		response.Error(c, http.StatusNotFound, "TAG_NOT_FOUND", "Tag not found.")
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"tag": tag,
	})
}

// ListAuthors handles GET /api/v1/authors
func (h *Handler) ListAuthors(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "12"))

	authors, total, err := h.svc.ListAuthors(c.Request.Context(), page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
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

// GetAuthor handles GET /api/v1/authors/:username
func (h *Handler) GetAuthor(c *gin.Context) {
	username := c.Param("username")
	author, err := h.svc.GetAuthorProfile(c.Request.Context(), username)
	if err != nil {
		response.Error(c, http.StatusNotFound, "AUTHOR_NOT_FOUND", "Author profile not found.")
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"author": author,
	})
}

// ListAuthorArticles handles GET /api/v1/authors/:username/articles
func (h *Handler) ListAuthorArticles(c *gin.Context) {
	username := c.Param("username")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	articles, total, err := h.svc.ListAuthorArticles(c.Request.Context(), username, page, perPage)
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
		},
	})
}

// GetAuthorStats handles GET /api/v1/authors/:username/stats
func (h *Handler) GetAuthorStats(c *gin.Context) {
	username := c.Param("username")
	stats, err := h.svc.GetAuthorStats(c.Request.Context(), username)
	if err != nil {
		if errors.Is(err, ErrAuthorNotFound) {
			response.Error(c, http.StatusNotFound, "AUTHOR_NOT_FOUND", "Author profile not found.")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"stats": stats,
	})
}

// GetMyProfile handles GET /api/v1/authors/me
func (h *Handler) GetMyProfile(c *gin.Context) {
	val, exists := c.Get(middleware.ContextUserID)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		response.Error(c, http.StatusInternalServerError, "INVALID_CONTEXT", "Invalid user context")
		return
	}

	profile, err := h.svc.GetAuthorProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrAuthorNotFound) {
			response.Error(c, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profile not found.")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"author": profile,
	})
}

// UpdateMyProfile handles PUT /api/v1/authors/me
func (h *Handler) UpdateMyProfile(c *gin.Context) {
	val, exists := c.Get(middleware.ContextUserID)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		response.Error(c, http.StatusInternalServerError, "INVALID_CONTEXT", "Invalid user context")
		return
	}

	var req UpdateProfileInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	profile, err := h.svc.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		if errors.Is(err, ErrInvalidUsername) {
			response.Error(c, http.StatusBadRequest, "INVALID_USERNAME", err.Error())
			return
		}
		if errors.Is(err, ErrUsernameTaken) {
			response.Error(c, http.StatusConflict, "USERNAME_TAKEN", err.Error())
			return
		}
		if errors.Is(err, ErrAuthorNotFound) {
			response.Error(c, http.StatusNotFound, "AUTHOR_NOT_FOUND", "Author profile not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"author":  profile,
	})
}


