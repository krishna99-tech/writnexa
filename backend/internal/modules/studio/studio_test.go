package studio

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupStudioTest(t *testing.T) (*database.DB, Service, content.Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	studioSvc := NewService(pool, queries)
	contentSvc := content.NewService(pool, queries)

	return pool, studioSvc, contentSvc
}

func TestStudio_CreateAndPublishLifecycle(t *testing.T) {
	pool, studioSvc, contentSvc := setupStudioTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Get existing author (Alex Morgan)
	author, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	authorID := uuid.MustParse(author.UserID)

	// Another author (Elena Rostova) for authorization tests
	otherAuthor, err := contentSvc.GetAuthorProfile(ctx, "elenarostova")
	require.NoError(t, err)
	otherAuthorID := uuid.MustParse(otherAuthor.UserID)

	// 2. Create Draft Article
	testTitle := "High-Throughput Event Streaming with Go and Kafka Architecture"
	testSubtitle := "Designing scalable event backbones with partition rebalancing."
	rawMarkdown := `# Streaming Architecture

This is a comprehensive guide to building **high-throughput** event streaming pipelines.

` + "```go\npackage main\n\nfunc main() {\n\tprintln(\"streaming\")\n}\n```" + `

<script>alert("malicious xss attempt");</script>

> Resilient systems decouple ingest from storage.
`
	draftStatus := "draft"
	draft, err := studioSvc.CreateArticle(ctx, authorID, CreateArticleInput{
		Title:    testTitle,
		Subtitle: &testSubtitle,
		Content:  rawMarkdown,
		Status:   &draftStatus,
		Tags:     []string{"Go", "Streaming", "Kafka", "Distributed Systems"},
	})
	require.NoError(t, err)
	assert.NotEmpty(t, draft.ID)
	assert.Equal(t, "draft", draft.Status)
	assert.Equal(t, testTitle, draft.Title)
	assert.NotEmpty(t, draft.Slug)
	assert.GreaterOrEqual(t, draft.ReadingTimeMinutes, int32(1))
	assert.Nil(t, draft.PublishedAt)

	// 3. Verify HTML rendering and safe sanitization
	assert.Contains(t, draft.ContentHTML, "<h1")
	assert.Contains(t, draft.ContentHTML, "<strong>high-throughput</strong>")
	assert.Contains(t, draft.ContentHTML, "<code")
	// Malicious script must be completely stripped out by bluemonday UGC policy!
	assert.NotContains(t, draft.ContentHTML, "<script>")
	assert.NotContains(t, draft.ContentHTML, "alert(")

	draftID := uuid.MustParse(draft.ID)

	// 4. Verify Ownership Enforcement
	// Other author cannot view or edit this draft
	_, err = studioSvc.GetArticle(ctx, otherAuthorID, draftID)
	assert.ErrorIs(t, err, ErrArticleNotFound)

	newTitle := "Hacked Title"
	_, err = studioSvc.UpdateArticle(ctx, otherAuthorID, draftID, UpdateArticleInput{
		Title: &newTitle,
	})
	assert.ErrorIs(t, err, ErrArticleNotFound)

	// Other author cannot publish or delete this draft
	_, err = studioSvc.PublishArticle(ctx, otherAuthorID, draftID)
	assert.ErrorIs(t, err, ErrArticleNotFound)

	err = studioSvc.DeleteArticle(ctx, otherAuthorID, draftID)
	require.NoError(t, err) // soft delete matches 0 rows

	// 5. Verify draft is NOT yet discoverable in public explorer
	_, err = contentSvc.GetArticleBySlug(ctx, draft.Slug)
	assert.ErrorIs(t, err, content.ErrArticleNotFound)

	// 6. Update Draft Content
	updatedSubtitle := "Updated subtitle with deeper stream processing patterns."
	updated, err := studioSvc.UpdateArticle(ctx, authorID, draftID, UpdateArticleInput{
		Subtitle: &updatedSubtitle,
		Tags:     []string{"Go", "Kafka", "Architecture"},
	})
	require.NoError(t, err)
	assert.Equal(t, updatedSubtitle, *updated.Subtitle)

	// 7. Publish Article
	published, err := studioSvc.PublishArticle(ctx, authorID, draftID)
	require.NoError(t, err)
	assert.Equal(t, "published", published.Status)
	assert.NotNil(t, published.PublishedAt)

	// 8. Immediately discoverable in public Explorer
	publicArticle, err := contentSvc.GetArticleBySlug(ctx, published.Slug)
	require.NoError(t, err)
	assert.Equal(t, published.Title, publicArticle.Title)
	assert.Equal(t, "alexmorgan", publicArticle.Author.Username)

	// 9. Check Studio Overview
	overview, err := studioSvc.GetOverview(ctx, authorID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, overview.TotalArticles, int64(1))
	assert.GreaterOrEqual(t, overview.PublishedCount, int64(1))

	// 10. Archive Article
	archived, err := studioSvc.ArchiveArticle(ctx, authorID, draftID)
	require.NoError(t, err)
	assert.Equal(t, "archived", archived.Status)

	// Once archived, public explorer can no longer read it
	_, err = contentSvc.GetArticleBySlug(ctx, published.Slug)
	assert.ErrorIs(t, err, content.ErrArticleNotFound)

	// 11. Clean up test article
	err = studioSvc.DeleteArticle(ctx, authorID, draftID)
	require.NoError(t, err)
}

func TestStudio_ListArticlesAndFilters(t *testing.T) {
	pool, studioSvc, contentSvc := setupStudioTest(t)
	defer pool.Close()

	ctx := context.Background()

	author, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	authorID := uuid.MustParse(author.UserID)

	// List all articles
	articles, total, err := studioSvc.ListArticles(ctx, authorID, "all", "", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, articles)

	// List published articles
	pubArticles, pubTotal, err := studioSvc.ListArticles(ctx, authorID, "published", "", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, pubTotal, int64(1))
	assert.NotEmpty(t, pubArticles)
	for _, a := range pubArticles {
		assert.Equal(t, "published", a.Status)
	}
}

func TestStudio_SlugGenerationAndValidation(t *testing.T) {
	assert.Equal(t, "go-concurrency-patterns", formatSlug("Go Concurrency Patterns!"))
	assert.Equal(t, "building-distributed-resilient-systems-2026", formatSlug("Building: Distributed & Resilient Systems (2026)"))
	assert.Equal(t, 2, int(calculateReadingTime("word " + strings.Repeat("word ", 250))))
	assert.Equal(t, 1, int(calculateReadingTime("Short article")))
}
