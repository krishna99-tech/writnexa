package operations

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// Liveness handles GET /health (Liveness probe)
func (h *Handler) Liveness(c *gin.Context) {
	h.svc.GetLiveness(c.Request.Context())
	response.JSON(c, http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now().UTC(),
	})
}

// Readiness handles GET /ready (Readiness probe)
func (h *Handler) Readiness(c *gin.Context) {
	isReady, checks := h.svc.GetReadiness(c.Request.Context())
	if !isReady {
		c.JSON(http.StatusServiceUnavailable, response.Response{
			Success: false,
			Data: gin.H{
				"ready":  false,
				"checks": checks,
			},
			Error: &response.APIError{
				Code:    "SERVICE_UNREADY",
				Message: "Critical platform services are not ready to handle traffic",
			},
		})
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"ready":     true,
		"checks":    checks,
		"timestamp": time.Now().UTC(),
	})
}

// GetSystemHealth handles GET /api/v1/admin/operations/health
func (h *Handler) GetSystemHealth(c *gin.Context) {
	healthData, err := h.svc.GetSystemHealth(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "HEALTH_CHECK_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, gin.H{"health": healthData})
}

// ListFailedJobs handles GET /api/v1/admin/operations/failed-jobs
func (h *Handler) ListFailedJobs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "25")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	jobs, err := h.svc.ListFailedJobs(c.Request.Context(), int32(limit), int32(offset))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"failed_jobs": jobs})
}

// RetryJob handles POST /api/v1/admin/operations/retry-job/:id
func (h *Handler) RetryJob(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid job ID")
		return
	}

	job, err := h.svc.RetryFailedJob(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "RETRY_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"status":  "queued_for_retry",
		"job_id":  idStr,
		"job":     job,
	})
}

// RetryAllJobs handles POST /api/v1/admin/operations/retry-all-jobs
func (h *Handler) RetryAllJobs(c *gin.Context) {
	err := h.svc.RetryAllFailedJobs(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "RETRY_ALL_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"status":  "all_failed_jobs_queued_for_retry",
		"message": "Eligible background tasks have been reset to pending state",
	})
}

