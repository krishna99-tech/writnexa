package ads

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) (*db.Queries, Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	q := db.New(pool.Pool)
	registry := NewProviderRegistry(q)
	svc := NewService(q, registry)

	t.Cleanup(func() {
		pool.Close()
	})

	return q, svc
}

func TestAds_ProviderAbstractionAndResolution(t *testing.T) {
	_, svc := setupTestDB(t)
	ctx := context.Background()

	// 1. Direct Provider Resolution (seeded Neon campaign)
	res, err := svc.ServePlacement(ctx, "homepage_top", "127.0.0.1", "Mozilla/5.0")
	require.NoError(t, err)
	assert.Equal(t, "homepage_top", res.SlotKey)
	assert.True(t, res.IsEnabled)
	assert.NotNil(t, res.Payload)
	assert.Equal(t, "direct", res.Payload.Provider)
	assert.NotEmpty(t, res.Payload.Headline)
	assert.NotEmpty(t, res.Payload.TargetURL)
	assert.NotEmpty(t, res.Payload.SponsorLabel)

	// 2. Test AdSense Resolution
	placements, err := svc.ListPlacements(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, placements)

	var targetPlacement db.AdPlacement
	for _, p := range placements {
		if p.SlotKey == "footer_banner" {
			targetPlacement = p
			break
		}
	}

	confJSON, _ := json.Marshal(map[string]interface{}{
		"adsense_slot_id":   "1234567890",
		"adsense_client_id": "ca-pub-test-quorix",
	})

	updated, err := svc.UpdatePlacement(ctx, targetPlacement.ID.Bytes, UpdatePlacementInput{
		Name:         targetPlacement.Name,
		Provider:     "adsense",
		IsEnabled:    true,
		Format:       "banner",
		FrequencyCap: 0,
		Config:       confJSON,
	})
	require.NoError(t, err)
	assert.Equal(t, "adsense", updated.Provider)

	adsenseRes, err := svc.ServePlacement(ctx, "footer_banner", "127.0.0.1", "Mozilla/5.0")
	require.NoError(t, err)
	assert.Equal(t, "adsense", adsenseRes.Provider)
	assert.NotNil(t, adsenseRes.Payload)
	assert.Equal(t, "adsense", adsenseRes.Payload.Provider)
	assert.Equal(t, "1234567890", adsenseRes.Payload.AdSenseSlotID)
	assert.True(t, adsenseRes.Payload.IsTestMode) // Test mode should be active for non-prod or test client

	// Restore placement to direct for consistency
	_, err = svc.UpdatePlacement(ctx, targetPlacement.ID.Bytes, UpdatePlacementInput{
		Name:         targetPlacement.Name,
		Provider:     "direct",
		IsEnabled:    true,
		Format:       "banner",
		FrequencyCap: 0,
		Config:       json.RawMessage(`{}`),
	})
	require.NoError(t, err)
}

func TestAds_ImpressionAndClickDeduplication(t *testing.T) {
	_, svc := setupTestDB(t)
	ctx := context.Background()

	res, err := svc.ServePlacement(ctx, "explore_feed", "192.168.1.100", "Chrome/120")
	require.NoError(t, err)
	require.NotNil(t, res.Payload)

	// 1. Record authentic impression
	err = svc.RecordImpression(ctx, RecordImpressionInput{
		PlacementID: res.PlacementID,
		CampaignID:  res.Payload.CampaignID,
		Provider:    res.Payload.Provider,
		Path:        "/explore",
		IP:          "192.168.1.100",
		UserAgent:   "Chrome/120",
	})
	assert.NoError(t, err)

	// 2. Immediate duplicate impression from same visitor hash on same day should be deduplicated
	err = svc.RecordImpression(ctx, RecordImpressionInput{
		PlacementID: res.PlacementID,
		CampaignID:  res.Payload.CampaignID,
		Provider:    res.Payload.Provider,
		Path:        "/explore",
		IP:          "192.168.1.100",
		UserAgent:   "Chrome/120",
	})
	assert.NoError(t, err, "Duplicate impression must be safely ignored via ON CONFLICT DO NOTHING")

	// 3. Record authentic click
	err = svc.RecordClick(ctx, RecordClickInput{
		PlacementID: res.PlacementID,
		CampaignID:  res.Payload.CampaignID,
		Provider:    res.Payload.Provider,
		TargetURL:   "https://neon.tech/?ref=quorix",
		IP:          "192.168.1.100",
		UserAgent:   "Chrome/120",
	})
	assert.NoError(t, err)

	// 4. Duplicate click from same visitor on same day should be deduplicated (anti-click fraud)
	err = svc.RecordClick(ctx, RecordClickInput{
		PlacementID: res.PlacementID,
		CampaignID:  res.Payload.CampaignID,
		Provider:    res.Payload.Provider,
		TargetURL:   "https://neon.tech/?ref=quorix",
		IP:          "192.168.1.100",
		UserAgent:   "Chrome/120",
	})
	assert.NoError(t, err, "Duplicate click must be safely ignored")
}

func TestAds_CampaignLifecycleAndRevenueAttribution(t *testing.T) {
	_, svc := setupTestDB(t)
	ctx := context.Background()

	// 1. Create a custom Direct Campaign
	uniqueName := fmt.Sprintf("Supabase Dev Launch %d", time.Now().UnixNano())
	now := time.Now().UTC()
	end := now.AddDate(0, 1, 0)

	created, err := svc.CreateCampaign(ctx, CreateCampaignInput{
		Name:         uniqueName,
		Advertiser:   "Supabase Inc.",
		SponsorLabel: "Sponsored by Supabase",
		Headline:     "Build in a weekend, scale to millions",
		Body:         "The open source Firebase alternative. Instantly spin up a dedicated Postgres database.",
		CtaText:      "Start Project",
		TargetURL:    "https://supabase.com/?ref=quorix",
		ImageURL:     "https://supabase.com/brand/logo.png",
		Format:       "native",
		Placements:   []string{"article_sidebar"},
		Status:       "active",
		CPM:          4.00,
		CPC:          0.60,
		StartDate:    now,
		EndDate:      &end,
	})
	require.NoError(t, err)
	assert.Equal(t, uniqueName, created.Name)
	assert.Equal(t, "active", created.Status)

	// 2. Fetch single campaign
	fetched, err := svc.GetCampaign(ctx, created.ID.Bytes)
	require.NoError(t, err)
	assert.Equal(t, created.ID, fetched.ID)

	// 3. Update campaign status to paused
	updated, err := svc.UpdateCampaign(ctx, created.ID.Bytes, UpdateCampaignInput{
		Name:         created.Name,
		Advertiser:   created.Advertiser,
		SponsorLabel: created.SponsorLabel,
		Headline:     "Updated Headline",
		Body:         created.Body,
		CtaText:      created.CtaText,
		TargetURL:    created.TargetUrl,
		ImageURL:     created.ImageUrl,
		Format:       created.Format,
		Placements:   created.Placements,
		Status:       "paused",
		CPM:          4.50,
		CPC:          0.70,
		StartDate:    created.StartDate.Time,
		EndDate:      &end,
	})
	require.NoError(t, err)
	assert.Equal(t, "paused", updated.Status)
	assert.Equal(t, "Updated Headline", updated.Headline)

	// 4. Delete campaign
	err = svc.DeleteCampaign(ctx, created.ID.Bytes)
	assert.NoError(t, err)

	_, err = svc.GetCampaign(ctx, created.ID.Bytes)
	assert.Error(t, err, "Campaign should be deleted")
}

func TestAds_RevenueDistinctionAndAnalytics(t *testing.T) {
	_, svc := setupTestDB(t)
	ctx := context.Background()

	// 1. Record third-party reported revenue (e.g. Google AdSense verified statement)
	recordDate := time.Now().UTC().Truncate(24 * time.Hour)
	revStatement, err := svc.RecordProviderRevenue(ctx, RecordProviderRevenueInput{
		Provider:            "adsense",
		Date:                recordDate,
		ReportedImpressions: 5000,
		ReportedClicks:      75,
		ReportedRevenue:     18.50,
		Currency:            "USD",
	})
	require.NoError(t, err)
	assert.Equal(t, "adsense", revStatement.Provider)

	// 2. Query Analytics
	analytics, err := svc.GetAnalytics(ctx, "30d", nil, nil)
	require.NoError(t, err)

	assert.NotEmpty(t, analytics.Placements)
	// Verify that provider-reported revenue is populated distinctly from internal estimated direct revenue
	assert.GreaterOrEqual(t, analytics.ProviderReportedRevenue, 18.50)
	assert.GreaterOrEqual(t, analytics.TotalImpressions, int64(1))
}

func TestAds_ErrorTelemetryLogging(t *testing.T) {
	_, svc := setupTestDB(t)
	ctx := context.Background()

	// Record an ad error (e.g., client ad blocker or script load timeout)
	err := svc.RecordError(ctx, RecordErrorInput{
		PlacementKey: "homepage_top",
		Provider:     "adsense",
		ErrorCode:    "ERR_BLOCKED_BY_CLIENT",
		ErrorMessage: "Ad script failed to fetch due to client network filtering",
		URL:          "https://quorix.io/",
	})
	require.NoError(t, err)

	// Retrieve error logs
	errorLogs, err := svc.ListErrors(ctx, 10, 0)
	require.NoError(t, err)
	require.NotEmpty(t, errorLogs)

	assert.Equal(t, "homepage_top", errorLogs[0].PlacementKey)
	assert.Equal(t, "ERR_BLOCKED_BY_CLIENT", errorLogs[0].ErrorCode)
}
