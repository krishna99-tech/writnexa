package admin

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

func getActorContext(c *gin.Context) (uuid.UUID, string, string) {
	valID, _ := c.Get(middleware.ContextUserID)
	actorID, _ := valID.(uuid.UUID)

	valEmail, _ := c.Get(middleware.ContextEmail)
	actorEmail, _ := valEmail.(string)

	valRole, _ := c.Get(middleware.ContextRole)
	actorRole, _ := valRole.(string)

	return actorID, actorEmail, actorRole
}

// GetDashboardStats handles GET /api/v1/admin/dashboard
func (h *Handler) GetDashboardStats(c *gin.Context) {
	stats, err := h.svc.GetDashboardStats(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "STATS_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"stats": stats,
	})
}

// ListUsers handles GET /api/v1/admin/users
func (h *Handler) ListUsers(c *gin.Context) {
	query := c.Query("q")
	role := c.Query("role")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	users, total, err := h.svc.ListUsers(c.Request.Context(), query, role, status, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"users": users,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
		},
	})
}

// GetUserDetail handles GET /api/v1/admin/users/:id
func (h *Handler) GetUserDetail(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	detail, err := h.svc.GetUserDetail(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"user": detail,
	})
}

// UpdateUserStatus handles PUT /api/v1/admin/users/:id/status
func (h *Handler) UpdateUserStatus(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.UpdateUserStatus(c.Request.Context(), actorID, actorEmail, actorRole, targetID, req.Status, ip, ua); err != nil {
		if errors.Is(err, ErrSuperAdminRequired) {
			response.Error(c, http.StatusForbidden, "SUPER_ADMIN_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrInvalidStatus) {
			response.Error(c, http.StatusBadRequest, "INVALID_STATUS", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "User status updated successfully",
	})
}

// UpdateUserRole handles PUT /api/v1/admin/users/:id/role
func (h *Handler) UpdateUserRole(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.UpdateUserRole(c.Request.Context(), actorID, actorEmail, actorRole, targetID, req.Role, ip, ua); err != nil {
		if errors.Is(err, ErrSuperAdminRequired) {
			response.Error(c, http.StatusForbidden, "SUPER_ADMIN_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrInvalidRole) {
			response.Error(c, http.StatusBadRequest, "INVALID_ROLE", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "User role updated successfully",
	})
}

// ListArticles handles GET /api/v1/admin/articles
func (h *Handler) ListArticles(c *gin.Context) {
	query := c.Query("q")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	articles, total, err := h.svc.ListArticles(c.Request.Context(), query, status, page, perPage)
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

// ToggleFeatureArticle handles POST /api/v1/admin/articles/:id/feature
func (h *Handler) ToggleFeatureArticle(c *gin.Context) {
	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID format")
		return
	}

	var req struct {
		Featured bool `json:"featured"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.ToggleFeatureArticle(c.Request.Context(), actorID, actorEmail, actorRole, articleID, req.Featured, ip, ua); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article featured state updated",
	})
}

// ArchiveArticle handles POST /api/v1/admin/articles/:id/archive
func (h *Handler) ArchiveArticle(c *gin.Context) {
	articleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID format")
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.ArchiveArticle(c.Request.Context(), actorID, actorEmail, actorRole, articleID, ip, ua); err != nil {
		response.Error(c, http.StatusInternalServerError, "ARCHIVE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Article archived successfully",
	})
}

// ListAuditLogs handles GET /api/v1/admin/audit-logs
func (h *Handler) ListAuditLogs(c *gin.Context) {
	action := c.Query("action")
	targetType := c.Query("target_type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "25"))

	logs, total, err := h.svc.ListAuditLogs(c.Request.Context(), action, targetType, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"logs": logs,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
		},
	})
}

// ListModerationReports handles GET /api/v1/admin/reports
func (h *Handler) ListModerationReports(c *gin.Context) {
	status := c.Query("status")
	targetType := c.Query("target_type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	reports, total, err := h.svc.ListModerationReports(c.Request.Context(), status, targetType, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"reports": reports,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
		},
	})
}

// CreateModerationReport handles POST /api/v1/reports (Available to authenticated users)
func (h *Handler) CreateModerationReport(c *gin.Context) {
	valID, _ := c.Get(middleware.ContextUserID)
	reporterID, _ := valID.(uuid.UUID)

	var req struct {
		TargetType string `json:"target_type" binding:"required"`
		TargetID   string `json:"target_id" binding:"required,uuid"`
		Reason     string `json:"reason" binding:"required,min=3,max=255"`
		Details    string `json:"details" binding:"omitempty,max=1000"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	targetID := uuid.MustParse(req.TargetID)
	report, err := h.svc.CreateModerationReport(c.Request.Context(), reporterID, req.TargetType, targetID, req.Reason, req.Details)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "REPORT_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusCreated, gin.H{
		"message": "Report submitted for moderation review",
		"report":  report,
	})
}

// ResolveModerationReport handles POST /api/v1/admin/reports/:id/resolve
func (h *Handler) ResolveModerationReport(c *gin.Context) {
	reportID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid report ID format")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes" binding:"omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.ResolveModerationReport(c.Request.Context(), actorID, actorEmail, actorRole, reportID, req.Status, req.Notes, ip, ua); err != nil {
		if errors.Is(err, ErrInvalidStatus) {
			response.Error(c, http.StatusBadRequest, "INVALID_STATUS", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "RESOLVE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Report resolved successfully",
	})
}

// ListPlatformSettings handles GET /api/v1/admin/settings
func (h *Handler) ListPlatformSettings(c *gin.Context) {
	settings, err := h.svc.ListPlatformSettings(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"settings": settings,
	})
}

// UpdatePlatformSetting handles PUT /api/v1/admin/settings/:key
func (h *Handler) UpdatePlatformSetting(c *gin.Context) {
	key := c.Param("key")

	var req struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	actorID, actorEmail, actorRole := getActorContext(c)
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	if err := h.svc.UpdatePlatformSetting(c.Request.Context(), actorID, actorEmail, actorRole, key, req.Value, ip, ua); err != nil {
		if errors.Is(err, ErrSuperAdminRequired) {
			response.Error(c, http.StatusForbidden, "SUPER_ADMIN_REQUIRED", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Platform setting updated successfully",
	})
}

