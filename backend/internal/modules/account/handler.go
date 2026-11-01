package account

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

// GetProfile handles GET /api/v1/account/profile
func (h *Handler) GetProfile(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	profile, err := h.svc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "PROFILE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"profile": profile})
}

// UpdateProfile handles PUT /api/v1/account/profile
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var input ProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	updated, err := h.svc.UpdateProfile(c.Request.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrUsernameAlreadyTaken) {
			response.Error(c, http.StatusConflict, "USERNAME_TAKEN", "Username handle is already in use")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"profile": updated})
}

// UploadMedia handles POST /api/v1/account/upload
func (h *Handler) UploadMedia(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	mediaType := c.DefaultPostForm("type", "avatar")
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FILE", "Please provide a valid file upload")
		return
	}

	url, err := h.svc.UploadMedia(c.Request.Context(), userID, file, mediaType)
	if err != nil {
		if errors.Is(err, ErrInvalidFileFormat) {
			response.Error(c, http.StatusBadRequest, "INVALID_FORMAT", err.Error())
			return
		}
		if errors.Is(err, ErrFileTooLarge) {
			response.Error(c, http.StatusBadRequest, "FILE_TOO_LARGE", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"url":        url,
		"media_type": mediaType,
	})
}

type UpdateEmailRequest struct {
	Email           string `json:"email" binding:"required,email"`
	CurrentPassword string `json:"current_password" binding:"required"`
}

// UpdateEmail handles PUT /api/v1/account/email
func (h *Handler) UpdateEmail(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req UpdateEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	err := h.svc.UpdateEmail(c.Request.Context(), userID, req.Email, req.CurrentPassword)
	if err != nil {
		if errors.Is(err, ErrInvalidCurrentPassword) {
			response.Error(c, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect")
			return
		}
		if errors.Is(err, ErrEmailAlreadyTaken) {
			response.Error(c, http.StatusConflict, "EMAIL_TAKEN", "Email address is already in use")
			return
		}
		response.Error(c, http.StatusInternalServerError, "EMAIL_UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Email updated successfully. Please verify your new email."})
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword handles PUT /api/v1/account/password
func (h *Handler) ChangePassword(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	err := h.svc.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, ErrInvalidCurrentPassword) {
			response.Error(c, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect")
			return
		}
		if errors.Is(err, ErrPasswordTooShort) {
			response.Error(c, http.StatusBadRequest, "PASSWORD_TOO_SHORT", "New password must be at least 8 characters")
			return
		}
		response.Error(c, http.StatusInternalServerError, "PASSWORD_CHANGE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Password changed successfully. All other sessions have been logged out."})
}

// GetSettings handles GET /api/v1/account/settings
func (h *Handler) GetSettings(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	settings, err := h.svc.GetSettings(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SETTINGS_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"settings": settings})
}

// UpdateSettings handles PUT /api/v1/account/settings
func (h *Handler) UpdateSettings(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var settings UserSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	updated, err := h.svc.UpdateSettings(c.Request.Context(), userID, settings)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_SETTINGS_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"settings": updated})
}

// ListSessions handles GET /api/v1/account/sessions
func (h *Handler) ListSessions(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	sessions, err := h.svc.ListSessions(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SESSIONS_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, sessions)
}

// RevokeSession handles DELETE /api/v1/account/sessions/:id
func (h *Handler) RevokeSession(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid session ID")
		return
	}

	if err := h.svc.RevokeSession(c.Request.Context(), userID, sessionID); err != nil {
		response.Error(c, http.StatusInternalServerError, "REVOKE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Session revoked successfully"})
}

// GetReadingHistory handles GET /api/v1/account/history
func (h *Handler) GetReadingHistory(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	items, total, err := h.svc.GetReadingHistory(c.Request.Context(), userID, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "HISTORY_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"history":     items,
		"total_count": total,
		"page":        page,
		"per_page":    perPage,
	})
}

type RecordHistoryRequest struct {
	ArticleID        string `json:"article_id" binding:"required"`
	ScrollPercentage int    `json:"scroll_percentage"`
}

// RecordReadingHistory handles POST /api/v1/account/history
func (h *Handler) RecordReadingHistory(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req RecordHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	articleID, err := uuid.Parse(req.ArticleID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	err = h.svc.RecordReadingHistory(c.Request.Context(), userID, articleID, req.ScrollPercentage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "RECORD_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"status": "recorded"})
}

// DeleteReadingHistory handles DELETE /api/v1/account/history
func (h *Handler) DeleteReadingHistory(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var articleUUID *uuid.UUID
	if articleIDStr := c.Query("article_id"); articleIDStr != "" {
		if id, err := uuid.Parse(articleIDStr); err == nil {
			articleUUID = &id
		}
	}

	if err := h.svc.DeleteReadingHistory(c.Request.Context(), userID, articleUUID); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_HISTORY_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Reading history cleared"})
}

// GetReputation handles GET /api/v1/account/reputation
func (h *Handler) GetReputation(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	rep, err := h.svc.GetReputation(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "REPUTATION_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"reputation": rep})
}

type ConfirmPasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
}

// DeactivateAccount handles POST /api/v1/account/deactivate
func (h *Handler) DeactivateAccount(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req ConfirmPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	err := h.svc.DeactivateAccount(c.Request.Context(), userID, req.CurrentPassword)
	if err != nil {
		if errors.Is(err, ErrInvalidCurrentPassword) {
			response.Error(c, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect")
			return
		}
		response.Error(c, http.StatusInternalServerError, "DEACTIVATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Account deactivated successfully."})
}

// DeleteAccount handles DELETE /api/v1/account
func (h *Handler) DeleteAccount(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	var req ConfirmPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	err := h.svc.DeleteAccount(c.Request.Context(), userID, req.CurrentPassword)
	if err != nil {
		if errors.Is(err, ErrInvalidCurrentPassword) {
			response.Error(c, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect")
			return
		}
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Account scheduled for permanent deletion."})
}

