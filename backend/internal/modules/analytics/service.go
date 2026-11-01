package analytics

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

var (
	ErrUnauthorized = errors.New("unauthorized to view these analytics")
)

const HashSalt = "quorix-privacy-salt-v1"

type RecordEventInput struct {
	EventType  string     `json:"event_type" binding:"required"` // 'page_view', 'article_view', 'article_read'
	Path       string     `json:"path" binding:"required"`
	ArticleID  *uuid.UUID `json:"article_id,omitempty"`
	AuthorID   *uuid.UUID `json:"author_id,omitempty"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	IP         string     `json:"ip"`
	UserAgent  string     `json:"user_agent"`
	Referrer   string     `json:"referrer"`
	DeviceType string     `json:"device_type"`
}

type MetricTimeseriesPoint struct {
	Date           string `json:"date"`
	TotalViews     int64  `json:"total_views"`
	ArticleViews   int64  `json:"article_views,omitempty"`
	UniqueVisitors int64  `json:"unique_visitors"`
}

type TrafficSourceBreakdown struct {
	Source     string  `json:"source"`
	Count      int64   `json:"count"`
	Percentage float32 `json:"percentage"`
}

type TopCategoryMetric struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Slug           string `json:"slug"`
	ViewsCount     int64  `json:"views_count"`
	ArticlesCount  int64  `json:"articles_count"`
}

type TopArticleMetric struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	Slug              string `json:"slug"`
	AuthorUsername    string `json:"author_username"`
	AuthorDisplayName string `json:"author_display_name"`
	ViewsCount        int64  `json:"views_count"`
	UniqueVisitors    int64  `json:"unique_visitors"`
}

type PlatformAnalyticsResult struct {
	Range              string                   `json:"range"`
	StartDate          time.Time                `json:"start_date"`
	EndDate            time.Time                `json:"end_date"`
	TotalEvents        int64                    `json:"total_events"`
	TotalPageViews     int64                    `json:"total_page_views"`
	TotalArticleViews  int64                    `json:"total_article_views"`
	UniqueVisitors     int64                    `json:"unique_visitors"`
	NewRegistrations   int64                    `json:"new_registrations"`
	PublishedArticles  int64                    `json:"published_articles"`
	CommentsPosted     int64                    `json:"comments_posted"`
	LikesGiven         int64                    `json:"likes_given"`
	Timeseries         []MetricTimeseriesPoint  `json:"timeseries"`
	TrafficSources     []TrafficSourceBreakdown `json:"traffic_sources"`
	TopCategories      []TopCategoryMetric      `json:"top_categories"`
	TopArticles        []TopArticleMetric       `json:"top_articles"`
}

type AuthorArticlePerformanceItem struct {
	ID                 string     `json:"id"`
	Title              string     `json:"title"`
	Slug               string     `json:"slug"`
	ReadingTimeMinutes int32      `json:"reading_time_minutes"`
	Status             string     `json:"status"`
	PublishedAt        *time.Time `json:"published_at,omitempty"`
	ViewsCount         int64      `json:"views_count"`
	UniqueVisitors     int64      `json:"unique_visitors"`
	LikesCount         int32      `json:"likes_count"`
	BookmarksCount     int32      `json:"bookmarks_count"`
	CommentsCount      int32      `json:"comments_count"`
}

type AuthorAnalyticsResult struct {
	Range          string                         `json:"range"`
	StartDate      time.Time                      `json:"start_date"`
	EndDate        time.Time                      `json:"end_date"`
	TotalViews     int64                          `json:"total_views"`
	UniqueVisitors int64                          `json:"unique_visitors"`
	TotalLikes     int64                          `json:"total_likes"`
	TotalBookmarks int64                          `json:"total_bookmarks"`
	TotalComments  int64                          `json:"total_comments"`
	EngagementRate float32                        `json:"engagement_rate"`
	Timeseries     []MetricTimeseriesPoint        `json:"timeseries"`
	TrafficSources []TrafficSourceBreakdown       `json:"traffic_sources"`
	Articles       []AuthorArticlePerformanceItem `json:"articles"`
}

type Service interface {
	RecordEvent(ctx context.Context, input RecordEventInput) error
	GetPlatformAnalytics(ctx context.Context, rangeStr string, customFrom, customTo *time.Time) (*PlatformAnalyticsResult, error)
	GetAuthorAnalytics(ctx context.Context, authorID uuid.UUID, rangeStr string, customFrom, customTo *time.Time) (*AuthorAnalyticsResult, error)
}

type service struct {
	db *database.DB
	q  *db.Queries
}

func NewService(db *database.DB, q *db.Queries) Service {
	return &service{
		db: db,
		q:  q,
	}
}

// GeneratePrivacyHash creates a non-reversible SHA-256 hash using IP, User-Agent and Salt
func GeneratePrivacyHash(ip, ua string) string {
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("%s:%s:%s", HashSalt, ip, ua)))
	return hex.EncodeToString(hasher.Sum(nil))
}

// DetectTrafficSource categorizes HTTP referrer into clean discovery buckets
func DetectTrafficSource(ref string) string {
	trimmed := strings.TrimSpace(ref)
	if trimmed == "" {
		return "direct"
	}

	u, err := url.Parse(trimmed)
	if err != nil {
		return "other"
	}

	host := strings.ToLower(u.Hostname())
	if strings.Contains(host, "google.") {
		return "google"
	}
	if strings.Contains(host, "twitter.") || strings.Contains(host, "t.co") || strings.Contains(host, "x.com") {
		return "twitter"
	}
	if strings.Contains(host, "github.") {
		return "github"
	}
	if strings.Contains(host, "linkedin.") {
		return "linkedin"
	}
	if strings.Contains(host, "reddit.") {
		return "reddit"
	}
	if strings.Contains(host, "quorix.io") || strings.Contains(host, "localhost") {
		return "internal"
	}

	return "other"
}

func parseDateRange(rangeStr string, customFrom, customTo *time.Time) (time.Time, time.Time) {
	now := time.Now().UTC()
	end := now

	if customFrom != nil && customTo != nil {
		return customFrom.UTC(), customTo.UTC()
	}

	switch strings.ToLower(rangeStr) {
	case "24h", "daily", "today":
		return now.Add(-24 * time.Hour), end
	case "7d", "weekly":
		return now.AddDate(0, 0, -7), end
	case "30d", "monthly":
		return now.AddDate(0, 0, -30), end
	case "90d", "quarterly":
		return now.AddDate(0, 0, -90), end
	default: // default to 30 days
		return now.AddDate(0, 0, -30), end
	}
}

func (s *service) RecordEvent(ctx context.Context, input RecordEventInput) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	visitorHash := GeneratePrivacyHash(input.IP, input.UserAgent)
	source := DetectTrafficSource(input.Referrer)

	device := "desktop"
	uaLower := strings.ToLower(input.UserAgent)
	if strings.Contains(uaLower, "mobile") || strings.Contains(uaLower, "android") || strings.Contains(uaLower, "iphone") {
		device = "mobile"
	} else if strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "tablet") {
		device = "tablet"
	}

	var articleID, authorID, userID pgtype.UUID
	if input.ArticleID != nil {
		articleID = pgtype.UUID{Bytes: *input.ArticleID, Valid: true}
	}
	if input.AuthorID != nil {
		authorID = pgtype.UUID{Bytes: *input.AuthorID, Valid: true}
	}
	if input.UserID != nil {
		userID = pgtype.UUID{Bytes: *input.UserID, Valid: true}
	}

	var refText pgtype.Text
	if input.Referrer != "" {
		refText = pgtype.Text{String: input.Referrer, Valid: true}
	}

	return s.q.RecordAnalyticsEvent(ctx, db.RecordAnalyticsEventParams{
		EventType:   input.EventType,
		Path:        input.Path,
		ArticleID:   articleID,
		AuthorID:    authorID,
		UserID:      userID,
		VisitorHash: visitorHash,
		Referrer:    refText,
		Source:      source,
		DeviceType:  device,
	})
}

func (s *service) GetPlatformAnalytics(ctx context.Context, rangeStr string, customFrom, customTo *time.Time) (*PlatformAnalyticsResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	start, end := parseDateRange(rangeStr, customFrom, customTo)
	startParam := pgtype.Timestamptz{Time: start, Valid: true}
	endParam := pgtype.Timestamptz{Time: end, Valid: true}

	// 1. Overview
	overview, err := s.q.GetPlatformAnalyticsOverview(ctx, db.GetPlatformAnalyticsOverviewParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	// 2. Timeseries
	tsRows, err := s.q.GetPlatformTimeseries(ctx, db.GetPlatformTimeseriesParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	timeseries := make([]MetricTimeseriesPoint, 0)
	for _, row := range tsRows {
		timeseries = append(timeseries, MetricTimeseriesPoint{
			Date:           row.Day.Time.Format("2006-01-02"),
			TotalViews:     row.TotalViews,
			ArticleViews:   row.ArticleViews,
			UniqueVisitors: row.UniqueVisitors,
		})
	}

	// 3. Traffic Sources
	sourceRows, err := s.q.GetPlatformTrafficSources(ctx, db.GetPlatformTrafficSourcesParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	trafficSources := make([]TrafficSourceBreakdown, 0)
	for _, r := range sourceRows {
		trafficSources = append(trafficSources, TrafficSourceBreakdown{
			Source:     r.Source,
			Count:      r.Count,
			Percentage: r.Percentage,
		})
	}

	// 4. Top Categories
	catRows, err := s.q.GetPlatformTopCategories(ctx, db.GetPlatformTopCategoriesParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	topCategories := make([]TopCategoryMetric, 0)
	for _, c := range catRows {
		topCategories = append(topCategories, TopCategoryMetric{
			ID:            uuid.UUID(c.ID.Bytes).String(),
			Name:          c.Name,
			Slug:          c.Slug,
			ViewsCount:    c.ViewsCount,
			ArticlesCount: c.ArticlesCount,
		})
	}

	// 5. Top Articles
	artRows, err := s.q.GetPlatformTopArticles(ctx, db.GetPlatformTopArticlesParams{
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	topArticles := make([]TopArticleMetric, 0)
	for _, a := range artRows {
		topArticles = append(topArticles, TopArticleMetric{
			ID:                uuid.UUID(a.ID.Bytes).String(),
			Title:             a.Title,
			Slug:              a.Slug,
			AuthorUsername:    a.AuthorUsername,
			AuthorDisplayName: a.AuthorDisplayName,
			ViewsCount:        a.ViewsCount,
			UniqueVisitors:    a.UniqueVisitors,
		})
	}

	return &PlatformAnalyticsResult{
		Range:             rangeStr,
		StartDate:         start,
		EndDate:           end,
		TotalEvents:       overview.TotalEvents,
		TotalPageViews:    overview.TotalPageViews,
		TotalArticleViews: overview.TotalArticleViews,
		UniqueVisitors:    overview.UniqueVisitors,
		NewRegistrations:  overview.NewRegistrations,
		PublishedArticles: overview.PublishedArticles,
		CommentsPosted:    overview.CommentsPosted,
		LikesGiven:        overview.LikesGiven,
		Timeseries:        timeseries,
		TrafficSources:    trafficSources,
		TopCategories:     topCategories,
		TopArticles:       topArticles,
	}, nil
}

func (s *service) GetAuthorAnalytics(ctx context.Context, authorID uuid.UUID, rangeStr string, customFrom, customTo *time.Time) (*AuthorAnalyticsResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	start, end := parseDateRange(rangeStr, customFrom, customTo)
	startParam := pgtype.Timestamptz{Time: start, Valid: true}
	endParam := pgtype.Timestamptz{Time: end, Valid: true}
	authorParam := pgtype.UUID{Bytes: authorID, Valid: true}

	// 1. Author Overview (Strictly isolated to authorID content)
	overview, err := s.q.GetAuthorAnalyticsOverview(ctx, db.GetAuthorAnalyticsOverviewParams{
		AuthorID:  authorParam,
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	// 2. Author Timeseries
	tsRows, err := s.q.GetAuthorTimeseries(ctx, db.GetAuthorTimeseriesParams{
		AuthorID:  authorParam,
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	timeseries := make([]MetricTimeseriesPoint, 0)
	for _, row := range tsRows {
		timeseries = append(timeseries, MetricTimeseriesPoint{
			Date:           row.Day.Time.Format("2006-01-02"),
			TotalViews:     row.TotalViews,
			UniqueVisitors: row.UniqueVisitors,
		})
	}

	// 3. Traffic Sources
	sourceRows, err := s.q.GetAuthorTrafficSources(ctx, db.GetAuthorTrafficSourcesParams{
		AuthorID:  authorParam,
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	trafficSources := make([]TrafficSourceBreakdown, 0)
	for _, r := range sourceRows {
		trafficSources = append(trafficSources, TrafficSourceBreakdown{
			Source:     r.Source,
			Count:      r.Count,
			Percentage: r.Percentage,
		})
	}

	// 4. Per-Article Performance
	artRows, err := s.q.GetAuthorArticlePerformance(ctx, db.GetAuthorArticlePerformanceParams{
		AuthorID:  authorParam,
		StartTime: startParam,
		EndTime:   endParam,
	})
	if err != nil {
		return nil, err
	}

	articles := make([]AuthorArticlePerformanceItem, 0)
	for _, a := range artRows {
		var pubAt *time.Time
		if a.PublishedAt.Valid {
			pubAt = &a.PublishedAt.Time
		}

		articles = append(articles, AuthorArticlePerformanceItem{
			ID:                 uuid.UUID(a.ID.Bytes).String(),
			Title:              a.Title,
			Slug:               a.Slug,
			ReadingTimeMinutes: a.ReadingTimeMinutes,
			Status:             a.Status,
			PublishedAt:        pubAt,
			ViewsCount:         a.ViewsCount,
			UniqueVisitors:     a.UniqueVisitors,
			LikesCount:         a.LikesCount,
			BookmarksCount:     a.BookmarksCount,
			CommentsCount:      a.CommentsCount,
		})
	}

	// Engagement rate: (likes + comments + bookmarks) / views * 100
	var engRate float32 = 0.0
	if overview.TotalViews > 0 {
		totalInteractions := overview.TotalLikes + overview.TotalComments + overview.TotalBookmarks
		engRate = float32(totalInteractions) * 100.0 / float32(overview.TotalViews)
	}

	return &AuthorAnalyticsResult{
		Range:          rangeStr,
		StartDate:      start,
		EndDate:        end,
		TotalViews:     overview.TotalViews,
		UniqueVisitors: overview.UniqueVisitors,
		TotalLikes:     overview.TotalLikes,
		TotalBookmarks: overview.TotalBookmarks,
		TotalComments:  overview.TotalComments,
		EngagementRate: engRate,
		Timeseries:     timeseries,
		TrafficSources: trafficSources,
		Articles:       articles,
	}, nil
}
