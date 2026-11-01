package email

import (
	"net/http"

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

// GetPreferences handles GET /api/v1/notifications/preferences
func (h *Handler) GetPreferences(c *gin.Context) {
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

	prefs, err := h.svc.GetPreferences(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"preferences": gin.H{
			"email_on_new_follower":    prefs.EmailOnNewFollower,
			"email_on_new_comment":     prefs.EmailOnNewComment,
			"email_on_reply":          prefs.EmailOnReply,
			"email_on_article_publish": prefs.EmailOnArticlePublish,
		},
	})
}

// UpdatePreferences handles PUT /api/v1/notifications/preferences
func (h *Handler) UpdatePreferences(c *gin.Context) {
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

	var req UpdatePreferencesInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid preferences payload.")
		return
	}

	updated, err := h.svc.UpdatePreferences(c.Request.Context(), userID, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Notification preferences updated successfully.",
		"preferences": gin.H{
			"email_on_new_follower":    updated.EmailOnNewFollower,
			"email_on_new_comment":     updated.EmailOnNewComment,
			"email_on_reply":          updated.EmailOnReply,
			"email_on_article_publish": updated.EmailOnArticlePublish,
		},
	})
}
