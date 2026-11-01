package search

import (
	"context"
	"testing"
	"time"

	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupSearchTest(t *testing.T) (*database.DB, Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	svc := NewService(pool, queries)

	return pool, svc
}

func TestSearch_ArticleTitleAndContent(t *testing.T) {
	pool, svc := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Search for title or content keyword
	articles, total, err := svc.SearchArticles(ctx, "architecture", "", "", "relevance", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, articles)

	// 2. Stemming test: "architectures" or "architectural" matches "architecture"
	stemmedArticles, stemmedTotal, err := svc.SearchArticles(ctx, "architectures", "", "", "relevance", 1, 10)
	require.NoError(t, err)
	assert.Equal(t, total, stemmedTotal, "English stemming should match related word forms")
	assert.Equal(t, len(articles), len(stemmedArticles))

	// 3. Search for distributed systems term
	distArticles, distTotal, err := svc.SearchArticles(ctx, "distributed", "", "", "relevance", 1, 10)
	require.NoError(t, err)
	if distTotal > 0 {
		assert.NotEmpty(t, distArticles)
	}
}

func TestSearch_AuthorSearch(t *testing.T) {
	pool, svc := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Search author by username prefix "alex"
	authors, total, err := svc.SearchAuthors(ctx, "alex", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, authors)
	assert.Contains(t, authors[0].Username, "alex")

	// 2. Search author by full name "Elena"
	elenaAuthors, elenaTotal, err := svc.SearchAuthors(ctx, "Elena", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, elenaTotal, int64(1))
	assert.NotEmpty(t, elenaAuthors)
	assert.Equal(t, "elenarostova", elenaAuthors[0].Username)

	// 3. Empty query returns top authors by follower count
	allAuthors, allTotal, err := svc.SearchAuthors(ctx, "", 1, 5)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, allTotal, int64(1))
	assert.NotEmpty(t, allAuthors)
}

func TestSearch_TopicAndTagFiltering(t *testing.T) {
	pool, svc := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Search with category filter
	catArticles, catTotal, err := svc.SearchArticles(ctx, "", "backend-engineering", "", "latest", 1, 10)
	require.NoError(t, err)
	if catTotal > 0 {
		for _, a := range catArticles {
			if a.Category != nil {
				assert.Equal(t, "backend-engineering", a.Category.Slug)
			}
		}
	}

	// 2. Search with both query and category filter
	filtered, _, err := svc.SearchArticles(ctx, "Go", "backend-engineering", "", "latest", 1, 10)
	require.NoError(t, err)
	for _, a := range filtered {
		if a.Category != nil {
			assert.Equal(t, "backend-engineering", a.Category.Slug)
		}
	}
}

func TestSearch_DiscoverySorting(t *testing.T) {
	pool, svc := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Latest Sort
	latest, _, err := svc.SearchArticles(ctx, "", "", "", "latest", 1, 5)
	require.NoError(t, err)
	if len(latest) >= 2 {
		for i := 0; i < len(latest)-1; i++ {
			assert.True(t, latest[i].PublishedAt.After(latest[i+1].PublishedAt) || latest[i].PublishedAt.Equal(latest[i+1].PublishedAt))
		}
	}

	// 2. Popular Sort
	popular, _, err := svc.SearchArticles(ctx, "", "", "", "popular", 1, 5)
	require.NoError(t, err)
	if len(popular) >= 2 {
		score1 := popular[0].LikesCount*3 + popular[0].BookmarksCount*2 + popular[0].CommentsCount*2 + popular[0].ViewsCount
		score2 := popular[1].LikesCount*3 + popular[1].BookmarksCount*2 + popular[1].CommentsCount*2 + popular[1].ViewsCount
		assert.GreaterOrEqual(t, score1, score2)
	}

	// 3. Trending Sort
	trending, _, err := svc.SearchArticles(ctx, "", "", "", "trending", 1, 5)
	require.NoError(t, err)
	assert.NotEmpty(t, trending)

	// 4. Dedicated Popular Endpoint
	popList, err := svc.ListPopularArticles(ctx, 4)
	require.NoError(t, err)
	assert.NotEmpty(t, popList)
}

func TestSearch_Pagination(t *testing.T) {
	pool, svc := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Page 1 with perPage 1
	p1, total, err := svc.SearchArticles(ctx, "", "", "", "latest", 1, 1)
	require.NoError(t, err)
	assert.Len(t, p1, 1)

	if total > 1 {
		// Page 2 with perPage 1
		p2, _, err := svc.SearchArticles(ctx, "", "", "", "latest", 2, 1)
		require.NoError(t, err)
		assert.Len(t, p2, 1)
		assert.NotEqual(t, p1[0].ID, p2[0].ID, "Subsequent pages should return distinct items")
	}
}

func TestSearch_QueryPerformanceAndExplain(t *testing.T) {
	pool, _ := setupSearchTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Measure query latency of full-text search with explain analyze
	explainQuery := `
		EXPLAIN ANALYZE
		SELECT a.id, a.title, ts_rank_cd(a.search_vector, websearch_to_tsquery('english', 'architecture systems')) as rank
		FROM articles a
		WHERE a.status = 'published' AND a.deleted_at IS NULL
		  AND a.search_vector @@ websearch_to_tsquery('english', 'architecture systems')
		ORDER BY rank DESC
		LIMIT 10;
	`

	// Warmup execution
	warmRows, err := pool.Pool.Query(ctx, explainQuery)
	require.NoError(t, err)
	warmRows.Close()

	start := time.Now()
	rows, err := pool.Pool.Query(ctx, explainQuery)
	require.NoError(t, err)
	defer rows.Close()

	var planLines []string
	for rows.Next() {
		var line string
		err := rows.Scan(&line)
		require.NoError(t, err)
		planLines = append(planLines, line)
	}
	elapsed := time.Since(start)

	assert.NotEmpty(t, planLines)
	assert.Less(t, elapsed, 250*time.Millisecond, "FTS query execution must be fast and indexed")
}

