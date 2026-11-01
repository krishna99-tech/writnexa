package admin

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAdminTest(t *testing.T) (*database.DB, Service, content.Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	adminSvc := NewService(pool, queries)
	contentSvc := content.NewService(pool, queries)

	return pool, adminSvc, contentSvc
}

func TestAdmin_DashboardStats(t *testing.T) {
	pool, adminSvc, _ := setupAdminTest(t)
	defer pool.Close()

	ctx := context.Background()

	stats, err := adminSvc.GetDashboardStats(ctx)
	require.NoError(t, err)
	assert.NotNil(t, stats)
	assert.GreaterOrEqual(t, stats.TotalUsers, int64(1))
	assert.GreaterOrEqual(t, stats.PublishedArticles, int64(1))
	assert.GreaterOrEqual(t, stats.TotalViews, int64(0))
}

func TestAdmin_UserManagementAndRoleRBAC(t *testing.T) {
	pool, adminSvc, contentSvc := setupAdminTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Get test users Alex and Marcus
	alex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(alex.UserID)

	marcus, err := contentSvc.GetAuthorProfile(ctx, "marcusvance")
	require.NoError(t, err)
	marcusID := uuid.MustParse(marcus.UserID)

	// 2. Test GetUserDetail
	detail, err := adminSvc.GetUserDetail(ctx, alexID)
	require.NoError(t, err)
	assert.Equal(t, "alexmorgan", *detail.Username)

	// 3. Test RBAC: Normal admin attempting to escalate to super_admin MUST be denied
	err = adminSvc.UpdateUserRole(ctx, marcusID, "marcus@quorix.io", "admin", alexID, "super_admin", "127.0.0.1", "Go-Test")
	assert.ErrorIs(t, err, ErrSuperAdminRequired, "Normal admin cannot grant super_admin role")

	// 4. Super admin successfully updates role
	err = adminSvc.UpdateUserRole(ctx, marcusID, "marcus@quorix.io", "super_admin", alexID, "author", "127.0.0.1", "Go-Test")
	require.NoError(t, err)

	// 5. Test User Suspension and Reactivation
	err = adminSvc.UpdateUserStatus(ctx, marcusID, "marcus@quorix.io", "super_admin", alexID, "suspended", "127.0.0.1", "Go-Test")
	require.NoError(t, err)

	alexDetailSuspended, err := adminSvc.GetUserDetail(ctx, alexID)
	require.NoError(t, err)
	assert.Equal(t, "suspended", alexDetailSuspended.Status)

	// Reactivate account
	err = adminSvc.UpdateUserStatus(ctx, marcusID, "marcus@quorix.io", "super_admin", alexID, "active", "127.0.0.1", "Go-Test")
	require.NoError(t, err)

	alexDetailActive, err := adminSvc.GetUserDetail(ctx, alexID)
	require.NoError(t, err)
	assert.Equal(t, "active", alexDetailActive.Status)

	// 6. Verify audit log entry was created
	logs, totalLogs, err := adminSvc.ListAuditLogs(ctx, "user.status_suspended", "user", 1, 5)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, totalLogs, int64(1))
	assert.NotEmpty(t, logs)
	assert.Equal(t, "user.status_suspended", logs[0].Action)
}

func TestAdmin_ArticleContentModeration(t *testing.T) {
	pool, adminSvc, contentSvc := setupAdminTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Get an article
	articles, _, err := contentSvc.ListAuthorArticles(ctx, "elenarostova", 1, 1)
	require.NoError(t, err)
	require.NotEmpty(t, articles)
	articleID := uuid.MustParse(articles[0].ID)

	marcus, err := contentSvc.GetAuthorProfile(ctx, "marcusvance")
	require.NoError(t, err)
	adminID := uuid.MustParse(marcus.UserID)

	// 1. Toggle feature
	err = adminSvc.ToggleFeatureArticle(ctx, adminID, "marcus@quorix.io", "admin", articleID, true, "127.0.0.1", "Go-Test")
	require.NoError(t, err)

	// Verify featured in list
	adminArts, _, err := adminSvc.ListArticles(ctx, articles[0].Title, "", 1, 5)
	require.NoError(t, err)
	require.NotEmpty(t, adminArts)
	assert.True(t, adminArts[0].Featured)

	// Unfeature
	err = adminSvc.ToggleFeatureArticle(ctx, adminID, "marcus@quorix.io", "admin", articleID, false, "127.0.0.1", "Go-Test")
	require.NoError(t, err)
}

func TestAdmin_ModerationReportsAndSettings(t *testing.T) {
	pool, adminSvc, contentSvc := setupAdminTest(t)
	defer pool.Close()

	ctx := context.Background()

	alex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	reporterID := uuid.MustParse(alex.UserID)

	marcus, err := contentSvc.GetAuthorProfile(ctx, "marcusvance")
	require.NoError(t, err)
	resolverID := uuid.MustParse(marcus.UserID)

	articles, _, err := contentSvc.ListAuthorArticles(ctx, "elenarostova", 1, 1)
	require.NoError(t, err)
	require.NotEmpty(t, articles)
	articleID := uuid.MustParse(articles[0].ID)

	// 1. Submit a moderation report
	report, err := adminSvc.CreateModerationReport(ctx, reporterID, "article", articleID, "Spam or misleading information", "Contains promotional links")
	require.NoError(t, err)
	assert.Equal(t, "pending", report.Status)
	reportID := uuid.MustParse(report.ID)

	// 2. List reports
	reports, total, err := adminSvc.ListModerationReports(ctx, "pending", "article", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, reports)

	// 3. Resolve report
	err = adminSvc.ResolveModerationReport(ctx, resolverID, "marcus@quorix.io", "moderator", reportID, "reviewed", "Reviewed by moderation team. Content is clean.", "127.0.0.1", "Go-Test")
	require.NoError(t, err)

	// 4. Platform Settings
	settings, err := adminSvc.ListPlatformSettings(ctx)
	require.NoError(t, err)
	assert.NotEmpty(t, settings)

	// Normal admin cannot update platform settings
	err = adminSvc.UpdatePlatformSetting(ctx, resolverID, "marcus@quorix.io", "admin", "site_name", "QUORIX Dev", "127.0.0.1", "Go-Test")
	assert.ErrorIs(t, err, ErrSuperAdminRequired)

	// Super admin can update platform settings
	err = adminSvc.UpdatePlatformSetting(ctx, resolverID, "marcus@quorix.io", "super_admin", "site_name", "QUORIX", "127.0.0.1", "Go-Test")
	require.NoError(t, err)
}

