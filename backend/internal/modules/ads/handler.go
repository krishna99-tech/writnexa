package ads

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

// ServePlacement handles GET /api/v1/ads/placements/:slot_key
func (h *Handler) ServePlacement(c *gin.Context) {
	slotKey := c.Param("slot_key")
	if slotKey == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_SLOT_KEY", "Slot key is required")
		return
	}

	res, err := h.svc.ServePlacement(c.Request.Context(), slotKey, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.Error(c, http.StatusNotFound, "PLACEMENT_NOT_FOUND", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"placement": res})
}

// RecordImpression handles POST /api/v1/ads/impressions
func (h *Handler) RecordImpression(c *gin.Context) {
	var req struct {
		PlacementID string  `json:"placement_id" binding:"required,uuid"`
		CampaignID  *string `json:"campaign_id" binding:"omitempty,uuid"`
		Provider    string  `json:"provider" binding:"required"`
		Path        string  `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	placementUUID := uuid.MustParse(req.PlacementID)
	var campaignUUID *uuid.UUID
	if req.CampaignID != nil && *req.CampaignID != "" {
		id := uuid.MustParse(*req.CampaignID)
		campaignUUID = &id
	}

	err := h.svc.RecordImpression(c.Request.Context(), RecordImpressionInput{
		PlacementID: placementUUID,
		CampaignID:  campaignUUID,
		Provider:    req.Provider,
		Path:        req.Path,
		IP:          c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "IMPRESSION_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"status": "recorded"})
}

// RecordClick handles POST /api/v1/ads/clicks
func (h *Handler) RecordClick(c *gin.Context) {
	var req struct {
		PlacementID string  `json:"placement_id" binding:"required,uuid"`
		CampaignID  *string `json:"campaign_id" binding:"omitempty,uuid"`
		Provider    string  `json:"provider" binding:"required"`
		TargetURL   string  `json:"target_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	placementUUID := uuid.MustParse(req.PlacementID)
	var campaignUUID *uuid.UUID
	if req.CampaignID != nil && *req.CampaignID != "" {
		id := uuid.MustParse(*req.CampaignID)
		campaignUUID = &id
	}

	err := h.svc.RecordClick(c.Request.Context(), RecordClickInput{
		PlacementID: placementUUID,
		CampaignID:  campaignUUID,
		Provider:    req.Provider,
		TargetURL:   req.TargetURL,
		IP:          c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "CLICK_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"status": "recorded"})
}

// RecordError handles POST /api/v1/ads/errors
func (h *Handler) RecordError(c *gin.Context) {
	var req struct {
		PlacementKey string `json:"placement_key" binding:"required"`
		Provider     string `json:"provider" binding:"required"`
		ErrorCode    string `json:"error_code" binding:"required"`
		ErrorMessage string `json:"error_message" binding:"required"`
		URL          string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	err := h.svc.RecordError(c.Request.Context(), RecordErrorInput{
		PlacementKey: req.PlacementKey,
		Provider:     req.Provider,
		ErrorCode:    req.ErrorCode,
		ErrorMessage: req.ErrorMessage,
		URL:          req.URL,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "ERROR_LOG_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"status": "recorded"})
}

// -----------------------------------------------------------------------------
// Admin Endpoints
// -----------------------------------------------------------------------------

// ListPlacements handles GET /api/v1/admin/ads/placements
func (h *Handler) ListPlacements(c *gin.Context) {
	placements, err := h.svc.ListPlacements(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, gin.H{"placements": placements})
}

// UpdatePlacement handles PUT /api/v1/admin/ads/placements/:id
func (h *Handler) UpdatePlacement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid placement ID")
		return
	}

	var req UpdatePlacementInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	res, err := h.svc.UpdatePlacement(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"placement": res})
}

// ListCampaigns handles GET /api/v1/admin/ads/campaigns
func (h *Handler) ListCampaigns(c *gin.Context) {
	campaigns, err := h.svc.ListCampaigns(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, gin.H{"campaigns": campaigns})
}

// GetCampaign handles GET /api/v1/admin/ads/campaigns/:id
func (h *Handler) GetCampaign(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid campaign ID")
		return
	}

	campaign, err := h.svc.GetCampaign(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", "Campaign not found")
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"campaign": campaign})
}

// CreateCampaign handles POST /api/v1/admin/ads/campaigns
func (h *Handler) CreateCampaign(c *gin.Context) {
	var req CreateCampaignInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	campaign, err := h.svc.CreateCampaign(c.Request.Context(), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusCreated, gin.H{"campaign": campaign})
}

// UpdateCampaign handles PUT /api/v1/admin/ads/campaigns/:id
func (h *Handler) UpdateCampaign(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid campaign ID")
		return
	}

	var req UpdateCampaignInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	campaign, err := h.svc.UpdateCampaign(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"campaign": campaign})
}

// DeleteCampaign handles DELETE /api/v1/admin/ads/campaigns/:id
func (h *Handler) DeleteCampaign(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid campaign ID")
		return
	}

	if err := h.svc.DeleteCampaign(c.Request.Context(), id); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

// GetAnalytics handles GET /api/v1/admin/ads/analytics
func (h *Handler) GetAnalytics(c *gin.Context) {
	rangeStr := c.DefaultQuery("range", "30d")

	var customFrom, customTo *time.Time
	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			customFrom = &t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			customTo = &t
		}
	}

	analytics, err := h.svc.GetAnalytics(c.Request.Context(), rangeStr, customFrom, customTo)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "ANALYTICS_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"analytics": analytics})
}

// ListErrors handles GET /api/v1/admin/ads/errors
func (h *Handler) ListErrors(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	errorsList, err := h.svc.ListErrors(c.Request.Context(), int32(limit), int32(offset))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"errors": errorsList})
}

// RecordProviderRevenue handles POST /api/v1/admin/ads/provider-revenue
func (h *Handler) RecordProviderRevenue(c *gin.Context) {
	var req struct {
		Provider            string  `json:"provider" binding:"required"`
		Date                string  `json:"date" binding:"required"`
		ReportedImpressions int32   `json:"reported_impressions"`
		ReportedClicks      int32   `json:"reported_clicks"`
		ReportedRevenue     float64 `json:"reported_revenue"`
		Currency            string  `json:"currency"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	parsedDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_DATE", "Date format must be YYYY-MM-DD")
		return
	}

	res, err := h.svc.RecordProviderRevenue(c.Request.Context(), RecordProviderRevenueInput{
		Provider:            req.Provider,
		Date:                parsedDate,
		ReportedImpressions: req.ReportedImpressions,
		ReportedClicks:      req.ReportedClicks,
		ReportedRevenue:     req.ReportedRevenue,
		Currency:            req.Currency,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SAVE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{"provider_revenue": res})
}
