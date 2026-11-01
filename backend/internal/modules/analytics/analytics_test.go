package analytics

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAnalyticsTest(t *testing.T) (*database.DB, Service, content.Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	analyticsSvc := NewService(pool, queries)
	contentSvc := content.NewService(pool, queries)

	return pool, analyticsSvc, contentSvc
}

func TestAnalytics_TrafficSourceDetection(t *testing.T) {
	assert.Equal(t, "direct", DetectTrafficSource(""))
	assert.Equal(t, "google", DetectTrafficSource("https://www.google.com/search?q=quorix"))
	assert.Equal(t, "twitter", DetectTrafficSource("https://t.co/abcxyz123"))
	assert.Equal(t, "github", DetectTrafficSource("https://github.com/quorix/quorix"))
	assert.Equal(t, "linkedin", DetectTrafficSource("https://www.linkedin.com/feed/"))
	assert.Equal(t, "internal", DetectTrafficSource("https://quorix.io/explore"))
	assert.Equal(t, "other", DetectTrafficSource("https://randomblog.dev/post"))
}

func TestAnalytics_EventRecordingAndDeduplication(t *testing.T) {
	pool, analyticsSvc, contentSvc := setupAnalyticsTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Fetch an article by Elena
	articles, _, err := contentSvc.ListAuthorArticles(ctx, "elenarostova", 1, 1)
	require.NoError(t, err)
	require.NotEmpty(t, articles)

	articleID := uuid.MustParse(articles[0].ID)
	author, err := contentSvc.GetAuthorProfile(ctx, "elenarostova")
	require.NoError(t, err)
	authorID := uuid.MustParse(author.UserID)

	// 1. Record first article view
	err = analyticsSvc.RecordEvent(ctx, RecordEventInput{
		EventType:  "article_view",
		Path:       "/article/" + articles[0].Slug,
		ArticleID:  &articleID,
		AuthorID:   &authorID,
		IP:         "198.51.100.42",
		UserAgent:  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
		Referrer:   "https://www.google.com/search?q=quorix",
		DeviceType: "desktop",
	})
	require.NoError(t, err)

	// 2. Immediate duplicate article view with exact same IP and UA on same day
	// Should be gracefully de-duplicated without error
	err = analyticsSvc.RecordEvent(ctx, RecordEventInput{
		EventType:  "article_view",
		Path:       "/article/" + articles[0].Slug,
		ArticleID:  &articleID,
		AuthorID:   &authorID,
		IP:         "198.51.100.42",
		UserAgent:  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
		Referrer:   "https://www.google.com/search?q=quorix",
		DeviceType: "desktop",
	})
	require.NoError(t, err, "Duplicate view on same day must be ignored without failing")

	// 3. Record distinct visitor view with different IP
	err = analyticsSvc.RecordEvent(ctx, RecordEventInput{
		EventType:  "article_view",
		Path:       "/article/" + articles[0].Slug,
		ArticleID:  &articleID,
		AuthorID:   &authorID,
		IP:         "203.0.113.19",
		UserAgent:  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
		Referrer:   "https://github.com/quorix",
		DeviceType: "mobile",
	})
	require.NoError(t, err)
}

func TestAnalytics_PlatformAnalytics(t *testing.T) {
	pool, analyticsSvc, _ := setupAnalyticsTest(t)
	defer pool.Close()

	ctx := context.Background()

	res, err := analyticsSvc.GetPlatformAnalytics(ctx, "30d", nil, nil)
	require.NoError(t, err)
	assert.NotNil(t, res)
	assert.GreaterOrEqual(t, res.TotalEvents, int64(1))
	assert.GreaterOrEqual(t, res.UniqueVisitors, int64(1))
	assert.NotEmpty(t, res.Timeseries)
	assert.NotEmpty(t, res.TrafficSources)
}

func TestAnalytics_AuthorContentIsolation(t *testing.T) {
	pool, analyticsSvc, contentSvc := setupAnalyticsTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Get Elena and Alex IDs
	elena, err := contentSvc.GetAuthorProfile(ctx, "elenarostova")
	require.NoError(t, err)
	elenaID := uuid.MustParse(elena.UserID)

	alex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(alex.UserID)

	// Fetch Elena's analytics
	elenaAnalytics, err := analyticsSvc.GetAuthorAnalytics(ctx, elenaID, "30d", nil, nil)
	require.NoError(t, err)
	assert.NotNil(t, elenaAnalytics)

	// Fetch Alex's analytics
	alexAnalytics, err := analyticsSvc.GetAuthorAnalytics(ctx, alexID, "30d", nil, nil)
	require.NoError(t, err)
	assert.NotNil(t, alexAnalytics)

	// STRICT ISOLATION ASSERTION: Elena's article performance list MUST NOT contain Alex's articles
	for _, art := range elenaAnalytics.Articles {
		assert.NotContains(t, art.Title, "Alex Morgan", "Elena's analytics must never leak Alex's content")
	}

	for _, art := range alexAnalytics.Articles {
		assert.NotContains(t, art.Title, "Elena Rostova", "Alex's analytics must never leak Elena's content")
	}
}

func TestAnalytics_DateRangeCustomFiltering(t *testing.T) {
	pool, analyticsSvc, _ := setupAnalyticsTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Test 24h range
	res24h, err := analyticsSvc.GetPlatformAnalytics(ctx, "24h", nil, nil)
	require.NoError(t, err)
	assert.NotNil(t, res24h)

	// Test custom date range
	now := time.Now().UTC()
	startCustom := now.AddDate(0, 0, -3)
	endCustom := now

	resCustom, err := analyticsSvc.GetPlatformAnalytics(ctx, "custom", &startCustom, &endCustom)
	require.NoError(t, err)
	assert.NotNil(t, resCustom)
	assert.True(t, resCustom.StartDate.Equal(startCustom))
}
