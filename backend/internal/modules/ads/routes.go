package ads

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes mounts public ad resolution and tracking endpoints, plus admin management routes
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Public Ad Serving & Telemetry
	adsGroup := r.Group("/ads")
	{
		adsGroup.GET("/placements/:slot_key", h.ServePlacement)
		adsGroup.POST("/impressions", h.RecordImpression)
		adsGroup.POST("/clicks", h.RecordClick)
		adsGroup.POST("/errors", h.RecordError)
	}

	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// Protected Admin Ad Management (Admin & Super Admin)
	adminGroup := r.Group("/admin/ads")
	adminGroup.Use(authMW, middleware.RequireRole("admin"))
	{
		// Placements
		adminGroup.GET("/placements", h.ListPlacements)
		adminGroup.PUT("/placements/:id", h.UpdatePlacement)

		// Campaigns
		adminGroup.GET("/campaigns", h.ListCampaigns)
		adminGroup.GET("/campaigns/:id", h.GetCampaign)
		adminGroup.POST("/campaigns", h.CreateCampaign)
		adminGroup.PUT("/campaigns/:id", h.UpdateCampaign)
		adminGroup.DELETE("/campaigns/:id", h.DeleteCampaign)

		// Analytics, Errors & Provider Settlements
		adminGroup.GET("/analytics", h.GetAnalytics)
		adminGroup.GET("/errors", h.ListErrors)
		adminGroup.POST("/provider-revenue", h.RecordProviderRevenue)
	}
}
