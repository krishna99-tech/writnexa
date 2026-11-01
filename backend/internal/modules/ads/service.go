package ads

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

const AdsSalt = "quorix_ads_salt_2026_v1"

// PlacementResponse contains placement status and active payload
type PlacementResponse struct {
	PlacementID  uuid.UUID  `json:"placement_id"`
	SlotKey      string     `json:"slot_key"`
	Name         string     `json:"name"`
	PageType     string     `json:"page_type"`
	Provider     string     `json:"provider"`
	IsEnabled    bool       `json:"is_enabled"`
	Format       string     `json:"format"`
	FrequencyCap int32      `json:"frequency_cap"`
	Payload      *AdPayload `json:"payload,omitempty"`
}

type RecordImpressionInput struct {
	PlacementID uuid.UUID
	CampaignID  *uuid.UUID
	Provider    string
	Path        string
	IP          string
	UserAgent   string
}

type RecordClickInput struct {
	PlacementID uuid.UUID
	CampaignID  *uuid.UUID
	Provider    string
	TargetURL   string
	IP          string
	UserAgent   string
}

type RecordErrorInput struct {
	PlacementKey string
	Provider     string
	ErrorCode    string
	ErrorMessage string
	URL          string
}

type UpdatePlacementInput struct {
	Name         string          `json:"name" binding:"required"`
	Provider     string          `json:"provider" binding:"required"`
	IsEnabled    bool            `json:"is_enabled"`
	Format       string          `json:"format" binding:"required"`
	FrequencyCap int32           `json:"frequency_cap"`
	Config       json.RawMessage `json:"config"`
}

type CreateCampaignInput struct {
	Name         string     `json:"name" binding:"required"`
	Advertiser   string     `json:"advertiser" binding:"required"`
	SponsorLabel string     `json:"sponsor_label" binding:"required"`
	Headline     string     `json:"headline" binding:"required"`
	Body         string     `json:"body" binding:"required"`
	CtaText      string     `json:"cta_text" binding:"required"`
	TargetURL    string     `json:"target_url" binding:"required"`
	ImageURL     string     `json:"image_url"`
	Format       string     `json:"format" binding:"required"`
	Placements   []string   `json:"placements"`
	Status       string     `json:"status" binding:"required"`
	CPM          float64    `json:"cpm"`
	CPC          float64    `json:"cpc"`
	StartDate    time.Time  `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
}

type UpdateCampaignInput struct {
	Name         string     `json:"name" binding:"required"`
	Advertiser   string     `json:"advertiser" binding:"required"`
	SponsorLabel string     `json:"sponsor_label" binding:"required"`
	Headline     string     `json:"headline" binding:"required"`
	Body         string     `json:"body" binding:"required"`
	CtaText      string     `json:"cta_text" binding:"required"`
	TargetURL    string     `json:"target_url" binding:"required"`
	ImageURL     string     `json:"image_url"`
	Format       string     `json:"format" binding:"required"`
	Placements   []string   `json:"placements"`
	Status       string     `json:"status" binding:"required"`
	CPM          float64    `json:"cpm"`
	CPC          float64    `json:"cpc"`
	StartDate    time.Time  `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
}

type AdTimeseriesPoint struct {
	Date        string `json:"date"`
	Impressions int64  `json:"impressions"`
	Clicks      int64  `json:"clicks"`
}

type AdPlacementStatItem struct {
	PlacementID   string  `json:"placement_id"`
	SlotKey       string  `json:"slot_key"`
	Name          string  `json:"name"`
	PageType      string  `json:"page_type"`
	Provider      string  `json:"provider"`
	IsEnabled     bool    `json:"is_enabled"`
	Impressions   int64   `json:"impressions"`
	Clicks        int64   `json:"clicks"`
	CtrPercentage float64 `json:"ctr_percentage"`
}

type AdCampaignStatItem struct {
	CampaignID       string  `json:"campaign_id"`
	Name             string  `json:"name"`
	Advertiser       string  `json:"advertiser"`
	SponsorLabel     string  `json:"sponsor_label"`
	Status           string  `json:"status"`
	CPM              float64 `json:"cpm"`
	CPC              float64 `json:"cpc"`
	Impressions      int64   `json:"impressions"`
	Clicks           int64   `json:"clicks"`
	CtrPercentage    float64 `json:"ctr_percentage"`
	EstimatedRevenue float64 `json:"estimated_revenue"`
}

type AdAnalyticsResult struct {
	Range                   string                `json:"range"`
	StartDate               string                `json:"start_date"`
	EndDate                 string                `json:"end_date"`
	TotalImpressions        int64                 `json:"total_impressions"`
	TotalClicks             int64                 `json:"total_clicks"`
	CtrPercentage           float64               `json:"ctr_percentage"`
	EstimatedDirectRevenue  float64               `json:"estimated_direct_revenue"`
	ProviderReportedRevenue float64               `json:"provider_reported_revenue"`
	Timeseries              []AdTimeseriesPoint   `json:"timeseries"`
	Placements              []AdPlacementStatItem `json:"placements"`
	Campaigns               []AdCampaignStatItem  `json:"campaigns"`
}

type RecordProviderRevenueInput struct {
	Provider            string    `json:"provider" binding:"required"`
	Date                time.Time `json:"date" binding:"required"`
	ReportedImpressions int32     `json:"reported_impressions"`
	ReportedClicks      int32     `json:"reported_clicks"`
	ReportedRevenue     float64   `json:"reported_revenue"`
	Currency            string    `json:"currency"`
}

type Service interface {
	ServePlacement(ctx context.Context, slotKey, ip, userAgent string) (*PlacementResponse, error)
	RecordImpression(ctx context.Context, input RecordImpressionInput) error
	RecordClick(ctx context.Context, input RecordClickInput) error
	RecordError(ctx context.Context, input RecordErrorInput) error

	// Admin Placements
	ListPlacements(ctx context.Context) ([]db.AdPlacement, error)
	UpdatePlacement(ctx context.Context, id uuid.UUID, input UpdatePlacementInput) (*db.AdPlacement, error)

	// Admin Campaigns
	ListCampaigns(ctx context.Context) ([]db.AdCampaign, error)
	GetCampaign(ctx context.Context, id uuid.UUID) (*db.AdCampaign, error)
	CreateCampaign(ctx context.Context, input CreateCampaignInput) (*db.AdCampaign, error)
	UpdateCampaign(ctx context.Context, id uuid.UUID, input UpdateCampaignInput) (*db.AdCampaign, error)
	DeleteCampaign(ctx context.Context, id uuid.UUID) error

	// Admin Telemetry & Reporting
	GetAnalytics(ctx context.Context, rangeStr string, customFrom, customTo *time.Time) (*AdAnalyticsResult, error)
	ListErrors(ctx context.Context, limit, offset int32) ([]db.AdError, error)
	RecordProviderRevenue(ctx context.Context, input RecordProviderRevenueInput) (*db.AdProviderRevenue, error)
}

type service struct {
	q        *db.Queries
	registry *ProviderRegistry
}

func NewService(q *db.Queries, registry *ProviderRegistry) Service {
	return &service{
		q:        q,
		registry: registry,
	}
}

// GenerateAdPrivacyHash produces salted SHA-256 for de-duplicating impression/click spam
func GenerateAdPrivacyHash(ip, ua string) string {
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("%s:%s:%s", AdsSalt, ip, ua)))
	return hex.EncodeToString(hasher.Sum(nil))
}

func (s *service) ServePlacement(ctx context.Context, slotKey, ip, userAgent string) (*PlacementResponse, error) {
	placement, err := s.q.GetPlacementBySlotKey(ctx, slotKey)
	if err != nil {
		return nil, fmt.Errorf("placement slot '%s' not found", slotKey)
	}

	resp := &PlacementResponse{
		PlacementID:  placement.ID.Bytes,
		SlotKey:      placement.SlotKey,
		Name:         placement.Name,
		PageType:     placement.PageType,
		Provider:     placement.Provider,
		IsEnabled:    placement.IsEnabled,
		Format:       placement.Format,
		FrequencyCap: placement.FrequencyCap,
	}

	if !placement.IsEnabled || placement.Provider == "disabled" {
		return resp, nil
	}

	provider, exists := s.registry.Get(placement.Provider)
	if !exists {
		// Fallback to direct if available
		provider, _ = s.registry.Get("direct")
	}

	if provider != nil {
		payload, err := provider.Resolve(ctx, &placement)
		if err == nil {
			resp.Payload = payload
		}
	}

	return resp, nil
}

func (s *service) RecordImpression(ctx context.Context, input RecordImpressionInput) error {
	visitorHash := GenerateAdPrivacyHash(input.IP, input.UserAgent)

	var campID pgtype.UUID
	if input.CampaignID != nil {
		campID = pgtype.UUID{Bytes: *input.CampaignID, Valid: true}
	}

	return s.q.RecordAdImpression(ctx, db.RecordAdImpressionParams{
		PlacementID: pgtype.UUID{Bytes: input.PlacementID, Valid: true},
		CampaignID:  campID,
		Provider:    input.Provider,
		VisitorHash: visitorHash,
		Path:        input.Path,
	})
}

func (s *service) RecordClick(ctx context.Context, input RecordClickInput) error {
	visitorHash := GenerateAdPrivacyHash(input.IP, input.UserAgent)

	var campID pgtype.UUID
	if input.CampaignID != nil {
		campID = pgtype.UUID{Bytes: *input.CampaignID, Valid: true}
	}

	return s.q.RecordAdClick(ctx, db.RecordAdClickParams{
		PlacementID: pgtype.UUID{Bytes: input.PlacementID, Valid: true},
		CampaignID:  campID,
		Provider:    input.Provider,
		VisitorHash: visitorHash,
		TargetUrl:   input.TargetURL,
	})
}

func (s *service) RecordError(ctx context.Context, input RecordErrorInput) error {
	_, err := s.q.RecordAdError(ctx, db.RecordAdErrorParams{
		PlacementKey: input.PlacementKey,
		Provider:     input.Provider,
		ErrorCode:    input.ErrorCode,
		ErrorMessage: input.ErrorMessage,
		Url:          input.URL,
	})
	return err
}

func (s *service) ListPlacements(ctx context.Context) ([]db.AdPlacement, error) {
	return s.q.ListAllPlacements(ctx)
}

func (s *service) UpdatePlacement(ctx context.Context, id uuid.UUID, input UpdatePlacementInput) (*db.AdPlacement, error) {
	res, err := s.q.UpdatePlacement(ctx, db.UpdatePlacementParams{
		ID:           pgtype.UUID{Bytes: id, Valid: true},
		Name:         input.Name,
		Provider:     input.Provider,
		IsEnabled:    input.IsEnabled,
		Format:       input.Format,
		FrequencyCap: input.FrequencyCap,
		Config:       input.Config,
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (s *service) ListCampaigns(ctx context.Context) ([]db.AdCampaign, error) {
	return s.q.ListAllCampaigns(ctx)
}

func (s *service) GetCampaign(ctx context.Context, id uuid.UUID) (*db.AdCampaign, error) {
	cmp, err := s.q.GetCampaignByID(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		return nil, err
	}
	return &cmp, nil
}

func (s *service) CreateCampaign(ctx context.Context, input CreateCampaignInput) (*db.AdCampaign, error) {
	var cpmNum, cpcNum pgtype.Numeric
	_ = cpmNum.Scan(fmt.Sprintf("%.4f", input.CPM))
	_ = cpcNum.Scan(fmt.Sprintf("%.4f", input.CPC))

	var startParam pgtype.Timestamptz
	startParam = pgtype.Timestamptz{Time: input.StartDate, Valid: !input.StartDate.IsZero()}
	if !startParam.Valid {
		startParam = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	}

	var endParam pgtype.Timestamptz
	if input.EndDate != nil && !input.EndDate.IsZero() {
		endParam = pgtype.Timestamptz{Time: *input.EndDate, Valid: true}
	}

	cmp, err := s.q.CreateCampaign(ctx, db.CreateCampaignParams{
		Name:         input.Name,
		Advertiser:   input.Advertiser,
		SponsorLabel: input.SponsorLabel,
		Headline:     input.Headline,
		Body:         input.Body,
		CtaText:      input.CtaText,
		TargetUrl:    input.TargetURL,
		ImageUrl:     input.ImageURL,
		Format:       input.Format,
		Placements:   input.Placements,
		Status:       input.Status,
		Cpm:          cpmNum,
		Cpc:          cpcNum,
		StartDate:    startParam,
		EndDate:      endParam,
	})
	if err != nil {
		return nil, err
	}
	return &cmp, nil
}

func (s *service) UpdateCampaign(ctx context.Context, id uuid.UUID, input UpdateCampaignInput) (*db.AdCampaign, error) {
	var cpmNum, cpcNum pgtype.Numeric
	_ = cpmNum.Scan(fmt.Sprintf("%.4f", input.CPM))
	_ = cpcNum.Scan(fmt.Sprintf("%.4f", input.CPC))

	var startParam pgtype.Timestamptz
	startParam = pgtype.Timestamptz{Time: input.StartDate, Valid: !input.StartDate.IsZero()}

	var endParam pgtype.Timestamptz
	if input.EndDate != nil && !input.EndDate.IsZero() {
		endParam = pgtype.Timestamptz{Time: *input.EndDate, Valid: true}
	}

	cmp, err := s.q.UpdateCampaign(ctx, db.UpdateCampaignParams{
		ID:           pgtype.UUID{Bytes: id, Valid: true},
		Name:         input.Name,
		Advertiser:   input.Advertiser,
		SponsorLabel: input.SponsorLabel,
		Headline:     input.Headline,
		Body:         input.Body,
		CtaText:      input.CtaText,
		TargetUrl:    input.TargetURL,
		ImageUrl:     input.ImageURL,
		Format:       input.Format,
		Placements:   input.Placements,
		Status:       input.Status,
		Cpm:          cpmNum,
		Cpc:          cpcNum,
		StartDate:    startParam,
		EndDate:      endParam,
	})
	if err != nil {
		return nil, err
	}
	return &cmp, nil
}

func (s *service) DeleteCampaign(ctx context.Context, id uuid.UUID) error {
	return s.q.DeleteCampaign(ctx, pgtype.UUID{Bytes: id, Valid: true})
}

func (s *service) GetAnalytics(ctx context.Context, rangeStr string, customFrom, customTo *time.Time) (*AdAnalyticsResult, error) {
	now := time.Now().UTC()
	var startTime time.Time

	switch rangeStr {
	case "24h":
		startTime = now.Add(-24 * time.Hour)
	case "7d":
		startTime = now.AddDate(0, 0, -7)
	case "30d":
		startTime = now.AddDate(0, 0, -30)
	case "90d":
		startTime = now.AddDate(0, 0, -90)
	case "custom":
		if customFrom != nil {
			startTime = *customFrom
		} else {
			startTime = now.AddDate(0, 0, -30)
		}
	default:
		rangeStr = "30d"
		startTime = now.AddDate(0, 0, -30)
	}

	endTime := now
	if customTo != nil {
		endTime = *customTo
	}

	startParam := pgtype.Timestamptz{Time: startTime, Valid: true}
	endParam := pgtype.Timestamptz{Time: endTime, Valid: true}

	// 1. Summary Stats
	summary, err := s.q.GetAdSummaryStats(ctx, startParam)
	if err != nil {
		return nil, err
	}

	// 2. Timeseries
	tsRows, err := s.q.GetAdTimeseries(ctx, db.GetAdTimeseriesParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	var timeseries []AdTimeseriesPoint
	for _, r := range tsRows {
		timeseries = append(timeseries, AdTimeseriesPoint{
			Date:        r.Date.Time.Format("2006-01-02"),
			Impressions: r.Impressions,
			Clicks:      r.Clicks,
		})
	}

	// 3. Placements Breakdown
	placementRows, err := s.q.GetAdPlacementStats(ctx, startParam)
	if err != nil {
		return nil, err
	}

	var placements []AdPlacementStatItem
	for _, p := range placementRows {
		placements = append(placements, AdPlacementStatItem{
			PlacementID:   uuid.UUID(p.PlacementID.Bytes).String(),
			SlotKey:       p.SlotKey,
			Name:          p.Name,
			PageType:      p.PageType,
			Provider:      p.Provider,
			IsEnabled:     p.IsEnabled,
			Impressions:   p.Impressions,
			Clicks:        p.Clicks,
			CtrPercentage: math.Round(p.CtrPercentage*100) / 100,
		})
	}

	// 4. Campaigns Breakdown & Estimated Revenue Calculation
	campaignRows, err := s.q.GetAdCampaignStats(ctx, startParam)
	if err != nil {
		return nil, err
	}

	var campaigns []AdCampaignStatItem
	var totalEstimatedRevenue float64

	for _, c := range campaignRows {
		cpmVal, _ := c.Cpm.Float64Value()
		cpcVal, _ := c.Cpc.Float64Value()
		revVal, _ := c.EstimatedRevenue.Float64Value()

		estimatedRev := revVal.Float64
		totalEstimatedRevenue += estimatedRev

		campaigns = append(campaigns, AdCampaignStatItem{
			CampaignID:       uuid.UUID(c.CampaignID.Bytes).String(),
			Name:             c.Name,
			Advertiser:       c.Advertiser,
			SponsorLabel:     c.SponsorLabel,
			Status:           c.Status,
			CPM:              cpmVal.Float64,
			CPC:              cpcVal.Float64,
			Impressions:      c.Impressions,
			Clicks:           c.Clicks,
			CtrPercentage:    math.Round(c.CtrPercentage*100) / 100,
			EstimatedRevenue: math.Round(estimatedRev*100) / 100,
		})
	}

	providerRevVal, _ := summary.ProviderReportedRevenue.Float64Value()

	return &AdAnalyticsResult{
		Range:                   rangeStr,
		StartDate:               startTime.Format(time.RFC3339),
		EndDate:                 endTime.Format(time.RFC3339),
		TotalImpressions:        summary.TotalImpressions,
		TotalClicks:             summary.TotalClicks,
		CtrPercentage:           math.Round(summary.CtrPercentage*100) / 100,
		EstimatedDirectRevenue:  math.Round(totalEstimatedRevenue*100) / 100,
		ProviderReportedRevenue: math.Round(providerRevVal.Float64*100) / 100,
		Timeseries:              timeseries,
		Placements:              placements,
		Campaigns:               campaigns,
	}, nil
}

func (s *service) ListErrors(ctx context.Context, limit, offset int32) ([]db.AdError, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.q.ListAdErrors(ctx, db.ListAdErrorsParams{
		Limit:  limit,
		Offset: offset,
	})
}

func (s *service) RecordProviderRevenue(ctx context.Context, input RecordProviderRevenueInput) (*db.AdProviderRevenue, error) {
	if input.Date.IsZero() {
		return nil, errors.New("valid date required")
	}

	var revNum pgtype.Numeric
	_ = revNum.Scan(fmt.Sprintf("%.4f", input.ReportedRevenue))

	currency := input.Currency
	if currency == "" {
		currency = "USD"
	}

	dateParam := pgtype.Date{Time: input.Date, Valid: true}

	res, err := s.q.RecordProviderRevenue(ctx, db.RecordProviderRevenueParams{
		Provider:            input.Provider,
		Date:                dateParam,
		ReportedImpressions: input.ReportedImpressions,
		ReportedClicks:      input.ReportedClicks,
		ReportedRevenue:     revNum,
		Currency:            currency,
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}
