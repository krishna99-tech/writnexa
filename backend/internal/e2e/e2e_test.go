package e2e_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/admin"
	"github.com/quorix/quorix-backend/internal/modules/ads"
	"github.com/quorix/quorix-backend/internal/modules/analytics"
	"github.com/quorix/quorix-backend/internal/modules/auth"
	"github.com/quorix/quorix-backend/internal/modules/community"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/quorix/quorix-backend/internal/modules/email"
	"github.com/quorix/quorix-backend/internal/modules/operations"
	"github.com/quorix/quorix-backend/internal/modules/studio"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupE2E(t *testing.T) (*gin.Engine, *config.Config, *database.DB, *db.Queries) {
	gin.SetMode(gin.TestMode)
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	q := db.New(pool.Pool)
	router := gin.New()

	// Services
	emailSvc := email.NewService(cfg, pool, q)
	authSvc := auth.NewService(pool, cfg)
	authSvc.SetEmailEnqueuer(email.NewAuthEnqueuerAdapter(emailSvc))
	authHandler := auth.NewHandler(authSvc, cfg)

	contentSvc := content.NewService(pool, q)
	contentHandler := content.NewHandler(contentSvc)

	studioSvc := studio.NewService(pool, q)
	studioHandler := studio.NewHandler(studioSvc)

	communitySvc := community.NewService(pool, q, emailSvc)
	communityHandler := community.NewHandler(communitySvc)

	adminSvc := admin.NewService(pool, q)
	adminHandler := admin.NewHandler(adminSvc)

	analyticsSvc := analytics.NewService(pool, q)
	analyticsHandler := analytics.NewHandler(analyticsSvc)

	adsRegistry := ads.NewProviderRegistry(q)
	adsSvc := ads.NewService(q, adsRegistry)
	adsHandler := ads.NewHandler(adsSvc)

	opsSvc := operations.NewService(pool, q, nil)
	opsHandler := operations.NewHandler(opsSvc)

	// Root health probes
	router.GET("/health", opsHandler.Liveness)
	router.GET("/ready", opsHandler.Readiness)

	v1 := router.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})
	}

	auth.RegisterRoutes(v1, authHandler, cfg)
	content.RegisterRoutes(v1, contentHandler, cfg)
	studio.RegisterRoutes(v1, studioHandler, cfg)
	community.RegisterRoutes(v1, communityHandler, cfg)
	admin.RegisterRoutes(v1, adminHandler, cfg)
	analytics.RegisterRoutes(v1, analyticsHandler, cfg)
	ads.RegisterRoutes(v1, adsHandler, cfg)
	operations.RegisterRoutes(v1, opsHandler, cfg)

	t.Cleanup(func() {
		pool.Close()
	})

	return router, cfg, pool, q
}

func TestE2E_FullPlatformLifecycle(t *testing.T) {
	_, _, pool, q := setupE2E(t)
	ctx := context.Background()

	// 1. Author Registration & Verification
	authorUsername := fmt.Sprintf("e2e_author_%d", time.Now().UnixNano()%100000)
	authorEmail := fmt.Sprintf("%s@quorix.io", authorUsername)
	authorID := uuid.New()

	_, err := pool.Pool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
		VALUES ($1, $2, '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', 'author', 'active', NOW())
	`, authorID, authorEmail)
	require.NoError(t, err)

	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO profiles (user_id, username, display_name, headline)
		VALUES ($1, $2, 'Elena Rostova', 'Principal Systems Architect')
	`, authorID, authorUsername)
	require.NoError(t, err)

	// 2. Author creates article draft in Studio
	articleSlug := fmt.Sprintf("e2e-distributed-consensus-%d", time.Now().UnixNano()%100000)
	articleID := uuid.New()

	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO articles (id, author_id, title, slug, subtitle, content, content_html, status, published_at)
		VALUES ($1, $2, 'Raft Consensus in Go', $3, 'A deep dive into distributed consensus.', 'Content body with Go raft protocol.', '<p>Content body with Go raft protocol.</p>', 'published', NOW())
	`, articleID, authorID, articleSlug)
	require.NoError(t, err)

	// 3. Reader User Registration
	readerUsername := fmt.Sprintf("e2e_reader_%d", time.Now().UnixNano()%100000)
	readerEmail := fmt.Sprintf("%s@quorix.io", readerUsername)
	readerID := uuid.New()

	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
		VALUES ($1, $2, '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', 'user', 'active', NOW())
	`, readerID, readerEmail)
	require.NoError(t, err)

	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO profiles (user_id, username, display_name)
		VALUES ($1, $2, 'Reader One')
	`, readerID, readerUsername)
	require.NoError(t, err)

	// 4. Community Interactions: Follow, Like, Comment
	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2)
	`, readerID, authorID)
	require.NoError(t, err)

	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO likes (user_id, article_id)
		VALUES ($1, $2)
	`, readerID, articleID)
	require.NoError(t, err)

	commentID := uuid.New()
	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO comments (id, article_id, author_id, content)
		VALUES ($1, $2, $3, 'Excellent breakdown of log replication!')
	`, commentID, articleID, readerID)
	require.NoError(t, err)

	// 5. Analytics Telemetry Ingestion
	visitorHash := analytics.GeneratePrivacyHash("203.0.113.195", "Mozilla/5.0")
	_, err = pool.Pool.Exec(ctx, `
		INSERT INTO analytics_events (event_type, path, article_id, author_id, visitor_hash, source)
		VALUES ('article_view', $1, $2, $3, $4, 'google')
	`, fmt.Sprintf("/article/%s", articleSlug), articleID, authorID, visitorHash)
	require.NoError(t, err)

	// 6. Advertisement Serving & Telemetry
	adsRegistry := ads.NewProviderRegistry(q)
	adsSvc := ads.NewService(q, adsRegistry)

	adPlacement, err := adsSvc.ServePlacement(ctx, "homepage_top", "203.0.113.195", "Mozilla/5.0")
	require.NoError(t, err)
	assert.True(t, adPlacement.IsEnabled)
	assert.NotNil(t, adPlacement.Payload)

	// 7. Operations Health Check
	opsSvc := operations.NewService(pool, q, nil)
	isAlive := opsSvc.GetLiveness(ctx)
	assert.True(t, isAlive)

	isReady, checks := opsSvc.GetReadiness(ctx)
	assert.True(t, isReady)
	assert.Equal(t, "ready", checks["database"])

	health, err := opsSvc.GetSystemHealth(ctx)
	require.NoError(t, err)
	assert.Equal(t, "healthy", health.OverallStatus)
	assert.Greater(t, health.Database.TotalConns, int32(0))
}

func TestE2E_ProbeHTTPResponses(t *testing.T) {
	router, _, _, _ := setupE2E(t)

	// 1. Root Liveness Probe
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 2. Protected Operations Health (requires admin JWT)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/admin/operations/health", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// 3. Ping
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/ping", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}
