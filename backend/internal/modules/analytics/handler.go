package analytics

import (
	"net/http"
	"time"

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

// CollectEvent handles POST /api/v1/analytics/collect (Public event collector)
func (h *Handler) CollectEvent(c *gin.Context) {
	var req struct {
		EventType string  `json:"event_type" binding:"required"`
		Path      string  `json:"path" binding:"required"`
		ArticleID *string `json:"article_id" binding:"omitempty,uuid"`
		AuthorID  *string `json:"author_id" binding:"omitempty,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	var articleUUID, authorUUID *uuid.UUID
	if req.ArticleID != nil {
		id := uuid.MustParse(*req.ArticleID)
		articleUUID = &id
	}
	if req.AuthorID != nil {
		id := uuid.MustParse(*req.AuthorID)
		authorUUID = &id
	}

	var userUUID *uuid.UUID
	if valID, exists := c.Get(middleware.ContextUserID); exists {
		if uid, ok := valID.(uuid.UUID); ok {
			userUUID = &uid
		}
	}

	input := RecordEventInput{
		EventType:  req.EventType,
		Path:       req.Path,
		ArticleID:  articleUUID,
		AuthorID:   authorUUID,
		UserID:     userUUID,
		IP:         c.ClientIP(),
		UserAgent:  c.Request.UserAgent(),
		Referrer:   c.Request.Referer(),
		DeviceType: "desktop",
	}

	// Non-blocking asynchronous recording or fast insert
	_ = h.svc.RecordEvent(c.Request.Context(), input)

	response.JSON(c, http.StatusOK, gin.H{"status": "recorded"})
}

// GetPlatformAnalytics handles GET /api/v1/admin/analytics (Admin/Super Admin only)
func (h *Handler) GetPlatformAnalytics(c *gin.Context) {
	rangeStr := c.DefaultQuery("range", "30d")
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var customFrom, customTo *time.Time
	if fromStr != "" && toStr != "" {
		if tFrom, err := time.Parse(time.RFC3339, fromStr); err == nil {
			if tTo, err := time.Parse(time.RFC3339, toStr); err == nil {
				customFrom = &tFrom
				customTo = &tTo
			}
		}
	}

	result, err := h.svc.GetPlatformAnalytics(c.Request.Context(), rangeStr, customFrom, customTo)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"analytics": result,
	})
}

// GetAuthorAnalytics handles GET /api/v1/studio/analytics (Author-isolated content telemetry)
func (h *Handler) GetAuthorAnalytics(c *gin.Context) {
	valID, exists := c.Get(middleware.ContextUserID)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	authorID, ok := valID.(uuid.UUID)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	rangeStr := c.DefaultQuery("range", "30d")
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var customFrom, customTo *time.Time
	if fromStr != "" && toStr != "" {
		if tFrom, err := time.Parse(time.RFC3339, fromStr); err == nil {
			if tTo, err := time.Parse(time.RFC3339, toStr); err == nil {
				customFrom = &tFrom
				customTo = &tTo
			}
		}
	}

	result, err := h.svc.GetAuthorAnalytics(c.Request.Context(), authorID, rangeStr, customFrom, customTo)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"analytics": result,
	})
}
