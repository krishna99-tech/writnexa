package content

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupContentTest(t *testing.T) (*database.DB, Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	svc := NewService(pool, queries)
	return pool, svc
}

func TestContent_ListArticles(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. List latest published
	articles, total, err := svc.ListPublishedArticles(ctx, 1, 10, "latest", "", "")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, articles)

	first := articles[0]
	assert.NotEmpty(t, first.Title)
	assert.NotEmpty(t, first.Slug)
	assert.NotEmpty(t, first.Author.Username)

	// 2. List Featured
	featured, err := svc.ListFeaturedArticles(ctx, 5)
	require.NoError(t, err)
	assert.NotEmpty(t, featured)

	// 3. List Trending
	trending, err := svc.ListTrendingArticles(ctx, 5)
	require.NoError(t, err)
	assert.NotEmpty(t, trending)
}

func TestContent_GetArticleBySlug(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	slug := "go-concurrency-pipelines-fan-out"
	article, err := svc.GetArticleBySlug(ctx, slug)
	require.NoError(t, err)
	assert.Equal(t, slug, article.Slug)
	assert.Equal(t, "alexmorgan", article.Author.Username)
	assert.Contains(t, article.Content, "Concurrency in Go")
	assert.GreaterOrEqual(t, len(article.Tags), 1)

	// Inactive / non-existent slug returns ErrArticleNotFound
	_, err = svc.GetArticleBySlug(ctx, "non-existent-article-slug-xyz")
	assert.ErrorIs(t, err, ErrArticleNotFound)
}

func TestContent_CategoriesAndTags(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	cats, err := svc.ListCategories(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(cats), 4)

	tags, err := svc.ListTags(ctx, 20, 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(tags), 3)

	cat, err := svc.GetCategoryBySlug(ctx, "go-systems")
	require.NoError(t, err)
	assert.Equal(t, "go-systems", cat.Slug)

	tag, err := svc.GetTagBySlug(ctx, "go")
	require.NoError(t, err)
	assert.Equal(t, "go", tag.Slug)
}

func TestContent_Authors(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	authors, total, err := svc.ListAuthors(ctx, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, authors)

	author, err := svc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	assert.Equal(t, "alexmorgan", author.Username)
	assert.Contains(t, *author.Headline, "Systems Architect")

	authorArticles, totalArts, err := svc.ListAuthorArticles(ctx, "alexmorgan", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, totalArts, int64(1))
	assert.NotEmpty(t, authorArticles)
}

func TestContent_Search(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	results, total, err := svc.SearchArticles(ctx, "Concurrency", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, results)
	assert.Contains(t, results[0].Title, "Concurrency")
}

func TestContent_AuthorStats(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Fetch stats for existing seeded author
	stats, err := svc.GetAuthorStats(ctx, "alexmorgan")
	require.NoError(t, err)
	assert.NotNil(t, stats)
	assert.GreaterOrEqual(t, stats.TotalArticles, int64(1))
	assert.GreaterOrEqual(t, stats.TotalViews, int64(0))

	// 2. Fetch stats for non-existent author
	_, err = svc.GetAuthorStats(ctx, "non_existent_author_9999")
	assert.ErrorIs(t, err, ErrAuthorNotFound)
}

func TestContent_UpdateProfileAndUsernameValidation(t *testing.T) {
	pool, svc := setupContentTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Get alexmorgan profile
	author, err := svc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	userID := uuid.MustParse(author.UserID)

	// 1. Invalid username regex validation (< 3 chars or invalid characters)
	shortName := "al"
	_, err = svc.UpdateProfile(ctx, userID, UpdateProfileInput{
		Username: &shortName,
	})
	assert.ErrorIs(t, err, ErrInvalidUsername)

	invalidCharName := "alex-morgan!"
	_, err = svc.UpdateProfile(ctx, userID, UpdateProfileInput{
		Username: &invalidCharName,
	})
	assert.ErrorIs(t, err, ErrInvalidUsername)

	// 2. Conflict validation with another existing author
	takenName := "elenarostova"
	_, err = svc.UpdateProfile(ctx, userID, UpdateProfileInput{
		Username: &takenName,
	})
	assert.ErrorIs(t, err, ErrUsernameTaken)

	// 3. Successful update of bio, headline and location
	newHeadline := "Principal Distributed Systems Architect"
	newLoc := "San Francisco, CA"
	newBio := "Exploring distributed consensus algorithms and high-throughput Go microservices."
	updated, err := svc.UpdateProfile(ctx, userID, UpdateProfileInput{
		Headline: &newHeadline,
		Location: &newLoc,
		Bio:      &newBio,
	})
	require.NoError(t, err)
	assert.Equal(t, newHeadline, *updated.Headline)
	assert.Equal(t, newLoc, *updated.Location)
	assert.Equal(t, newBio, *updated.Bio)

	// Revert to original headline for test purity
	origHeadline := "Staff Systems Architect & Go Contributor"
	_, _ = svc.UpdateProfile(ctx, userID, UpdateProfileInput{
		Headline: &origHeadline,
	})
}

