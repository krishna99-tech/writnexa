package studio

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/microcosm-cc/bluemonday"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

var (
	ErrArticleNotFound = errors.New("article not found or unauthorized")
	ErrInvalidTitle    = errors.New("article title is required (3 to 255 characters)")
	ErrInvalidSlug     = errors.New("article slug must contain only lowercase letters, numbers, and hyphens")
	ErrSlugTaken       = errors.New("article slug is already in use")
	ErrInvalidContent  = errors.New("article content cannot be empty")
)

var (
	nonAlphanumericRegex = regexp.MustCompile(`[^a-z0-9]+`)
	slugFormatRegex      = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

type StudioArticleSummary struct {
	ID                 string    `json:"id"`
	Title              string    `json:"title"`
	Slug               string    `json:"slug"`
	Subtitle           *string   `json:"subtitle,omitempty"`
	CoverImageURL      *string   `json:"cover_image_url,omitempty"`
	Status             string    `json:"status"`
	ReadingTimeMinutes int32     `json:"reading_time_minutes"`
	ViewsCount         int32     `json:"views_count"`
	LikesCount         int32     `json:"likes_count"`
	BookmarksCount     int32     `json:"bookmarks_count"`
	CommentsCount      int32     `json:"comments_count"`
	PublishedAt        *time.Time `json:"published_at,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CategoryName       *string   `json:"category_name,omitempty"`
	CategorySlug       *string   `json:"category_slug,omitempty"`
	Tags               []TagRef  `json:"tags,omitempty"`
}

type StudioArticleDetail struct {
	StudioArticleSummary
	Content      string  `json:"content"`
	ContentHTML  string  `json:"content_html"`
	CategoryID   *string `json:"category_id,omitempty"`
	CanonicalURL *string `json:"canonical_url,omitempty"`
}

type TagRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type StudioOverview struct {
	TotalArticles  int64 `json:"total_articles"`
	PublishedCount int64 `json:"published_count"`
	DraftCount     int64 `json:"draft_count"`
	ArchivedCount  int64 `json:"archived_count"`
	TotalViews     int64 `json:"total_views"`
	TotalLikes     int64 `json:"total_likes"`
	TotalComments  int64 `json:"total_comments"`
	TotalBookmarks int64 `json:"total_bookmarks"`
}

type CreateArticleInput struct {
	Title         string   `json:"title" binding:"required,min=3,max=255"`
	Slug          *string  `json:"slug" binding:"omitempty,max=255"`
	Subtitle      *string  `json:"subtitle" binding:"omitempty,max=350"`
	Content       string   `json:"content" binding:"required"`
	CoverImageURL *string  `json:"cover_image_url" binding:"omitempty,url"`
	CategoryID    *string  `json:"category_id" binding:"omitempty,uuid"`
	Tags          []string `json:"tags" binding:"omitempty"`
	Status        *string  `json:"status" binding:"omitempty,oneof=draft published archived"`
}

type UpdateArticleInput struct {
	Title         *string  `json:"title" binding:"omitempty,min=3,max=255"`
	Slug          *string  `json:"slug" binding:"omitempty,max=255"`
	Subtitle      *string  `json:"subtitle" binding:"omitempty,max=350"`
	Content       *string  `json:"content" binding:"omitempty"`
	CoverImageURL *string  `json:"cover_image_url" binding:"omitempty"`
	CategoryID    *string  `json:"category_id" binding:"omitempty"`
	Tags          []string `json:"tags" binding:"omitempty"`
	Status        *string  `json:"status" binding:"omitempty,oneof=draft published archived"`
}

type Service interface {
	CreateArticle(ctx context.Context, authorID uuid.UUID, input CreateArticleInput) (*StudioArticleDetail, error)
	UpdateArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID, input UpdateArticleInput) (*StudioArticleDetail, error)
	GetArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error)
	ListArticles(ctx context.Context, authorID uuid.UUID, status string, search string, page, perPage int) ([]StudioArticleSummary, int64, error)
	PublishArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error)
	ArchiveArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error)
	DeleteArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) error
	GetOverview(ctx context.Context, authorID uuid.UUID) (*StudioOverview, error)
}

type service struct {
	db        *database.DB
	q         *db.Queries
	md        goldmark.Markdown
	sanitizer *bluemonday.Policy
}

func NewService(dbConn *database.DB, q *db.Queries) Service {
	mdParser := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			extension.Table,
			extension.Strikethrough,
			extension.TaskList,
			extension.Linkify,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
			html.WithXHTML(),
		),
	)

	sanitizer := bluemonday.UGCPolicy()
	sanitizer.AllowAttrs("class").Matching(regexp.MustCompile(`^language-[a-zA-Z0-9_\-]+$`)).OnElements("code", "pre")
	sanitizer.AllowAttrs("id").Matching(regexp.MustCompile(`^[a-zA-Z0-9_\-]+$`)).OnElements("h1", "h2", "h3", "h4", "h5", "h6")

	return &service{
		db:        dbConn,
		q:         q,
		md:        mdParser,
		sanitizer: sanitizer,
	}
}

func (s *service) CreateArticle(ctx context.Context, authorID uuid.UUID, input CreateArticleInput) (*StudioArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	title := strings.TrimSpace(input.Title)
	if len(title) < 3 || len(title) > 255 {
		return nil, ErrInvalidTitle
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, ErrInvalidContent
	}

	// Calculate reading time
	readingTime := calculateReadingTime(content)

	// Render and sanitize content HTML
	contentHTML, err := s.renderMarkdown(content)
	if err != nil {
		return nil, fmt.Errorf("markdown rendering failed: %w", err)
	}

	// Generate and resolve slug
	var slug string
	if input.Slug != nil && strings.TrimSpace(*input.Slug) != "" {
		slug = formatSlug(*input.Slug)
		if !slugFormatRegex.MatchString(slug) {
			return nil, ErrInvalidSlug
		}
		taken, err := s.q.CheckArticleSlugExists(ctx, slug)
		if err != nil {
			return nil, err
		}
		if taken {
			return nil, ErrSlugTaken
		}
	} else {
		slug, err = s.generateUniqueSlug(ctx, title, uuid.Nil)
		if err != nil {
			return nil, err
		}
	}

	status := "draft"
	if input.Status != nil && *input.Status != "" {
		status = *input.Status
	}

	var pubAt pgtype.Timestamptz
	if status == "published" {
		pubAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	}

	var subtitle pgtype.Text
	if input.Subtitle != nil && strings.TrimSpace(*input.Subtitle) != "" {
		subtitle = pgtype.Text{String: strings.TrimSpace(*input.Subtitle), Valid: true}
	}

	var cover pgtype.Text
	if input.CoverImageURL != nil && strings.TrimSpace(*input.CoverImageURL) != "" {
		cover = pgtype.Text{String: strings.TrimSpace(*input.CoverImageURL), Valid: true}
	}

	var catID pgtype.UUID
	if input.CategoryID != nil && strings.TrimSpace(*input.CategoryID) != "" {
		parsedCatID, err := uuid.Parse(*input.CategoryID)
		if err == nil {
			catID = pgtype.UUID{Bytes: parsedCatID, Valid: true}
		}
	}

	authorUUID := pgtype.UUID{Bytes: authorID, Valid: true}

	created, err := s.q.CreateArticle(ctx, db.CreateArticleParams{
		AuthorID:           authorUUID,
		PublicationID:      pgtype.UUID{}, // No publication in MVP
		CategoryID:         catID,
		Title:              title,
		Slug:               slug,
		Subtitle:           subtitle,
		Content:            content,
		ContentHtml:        contentHTML,
		CoverImageUrl:      cover,
		CanonicalUrl:       pgtype.Text{},
		Status:             status,
		ReadingTimeMinutes: readingTime,
		PublishedAt:        pubAt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create article: %w", err)
	}

	articleID := uuid.UUID(created.ID.Bytes)

	// Sync tags
	if len(input.Tags) > 0 {
		_ = s.syncArticleTags(ctx, articleID, input.Tags)
	}

	return s.GetArticle(ctx, authorID, articleID)
}

func (s *service) UpdateArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID, input UpdateArticleInput) (*StudioArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	existing, err := s.q.GetStudioArticleByID(ctx, db.GetStudioArticleByIDParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		AuthorID: pgtype.UUID{Bytes: authorID, Valid: true},
	})
	if err != nil {
		return nil, ErrArticleNotFound
	}

	title := existing.Title
	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		title = strings.TrimSpace(*input.Title)
		if len(title) < 3 || len(title) > 255 {
			return nil, ErrInvalidTitle
		}
	}

	content := existing.Content
	if input.Content != nil {
		content = strings.TrimSpace(*input.Content)
		if content == "" {
			return nil, ErrInvalidContent
		}
	}

	contentHTML := existing.ContentHtml
	readingTime := existing.ReadingTimeMinutes
	if input.Content != nil {
		readingTime = calculateReadingTime(content)
		rendered, err := s.renderMarkdown(content)
		if err != nil {
			return nil, fmt.Errorf("markdown rendering failed: %w", err)
		}
		contentHTML = rendered
	}

	slug := existing.Slug
	if input.Slug != nil && strings.TrimSpace(*input.Slug) != "" {
		formatted := formatSlug(*input.Slug)
		if !slugFormatRegex.MatchString(formatted) {
			return nil, ErrInvalidSlug
		}
		taken, err := s.q.CheckArticleSlugExistsExceptID(ctx, db.CheckArticleSlugExistsExceptIDParams{
			Lower: formatted,
			ID:    pgtype.UUID{Bytes: articleID, Valid: true},
		})
		if err != nil {
			return nil, err
		}
		if taken {
			return nil, ErrSlugTaken
		}
		slug = formatted
	}

	status := existing.Status
	if input.Status != nil && *input.Status != "" {
		status = *input.Status
	}

	subtitle := existing.Subtitle
	if input.Subtitle != nil {
		subStr := strings.TrimSpace(*input.Subtitle)
		subtitle = pgtype.Text{String: subStr, Valid: subStr != ""}
	}

	cover := existing.CoverImageUrl
	if input.CoverImageURL != nil {
		coverStr := strings.TrimSpace(*input.CoverImageURL)
		cover = pgtype.Text{String: coverStr, Valid: coverStr != ""}
	}

	catID := existing.CategoryID
	if input.CategoryID != nil {
		catStr := strings.TrimSpace(*input.CategoryID)
		if catStr == "" {
			catID = pgtype.UUID{Valid: false}
		} else if parsed, err := uuid.Parse(catStr); err == nil {
			catID = pgtype.UUID{Bytes: parsed, Valid: true}
		}
	}

	_, err = s.q.UpdateArticle(ctx, db.UpdateArticleParams{
		ID:                 pgtype.UUID{Bytes: articleID, Valid: true},
		CategoryID:         catID,
		Title:              title,
		Slug:               slug,
		Subtitle:           subtitle,
		Content:            content,
		ContentHtml:        contentHTML,
		CoverImageUrl:      cover,
		CanonicalUrl:       existing.CanonicalUrl,
		Status:             status,
		ReadingTimeMinutes: readingTime,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update article: %w", err)
	}

	if input.Tags != nil {
		_ = s.syncArticleTags(ctx, articleID, input.Tags)
	}

	return s.GetArticle(ctx, authorID, articleID)
}

func (s *service) GetArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	r, err := s.q.GetStudioArticleByID(ctx, db.GetStudioArticleByIDParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		AuthorID: pgtype.UUID{Bytes: authorID, Valid: true},
	})
	if err != nil {
		return nil, ErrArticleNotFound
	}

	tags, _ := s.q.GetArticleTags(ctx, pgtype.UUID{Bytes: articleID, Valid: true})
	tagRefs := make([]TagRef, 0, len(tags))
	for _, t := range tags {
		tagRefs = append(tagRefs, TagRef{
			ID:   uuid.UUID(t.ID.Bytes).String(),
			Name: t.Name,
			Slug: t.Slug,
		})
	}

	var subtitle, cover, canonical, catID, catName, catSlug *string
	if r.Subtitle.Valid {
		subtitle = &r.Subtitle.String
	}
	if r.CoverImageUrl.Valid {
		cover = &r.CoverImageUrl.String
	}
	if r.CanonicalUrl.Valid {
		canonical = &r.CanonicalUrl.String
	}
	if r.CategoryID.Valid {
		idStr := uuid.UUID(r.CategoryID.Bytes).String()
		catID = &idStr
	}
	if r.CategoryName.Valid {
		catName = &r.CategoryName.String
	}
	if r.CategorySlug.Valid {
		catSlug = &r.CategorySlug.String
	}

	var pubAt *time.Time
	if r.PublishedAt.Valid {
		pubAt = &r.PublishedAt.Time
	}

	return &StudioArticleDetail{
		StudioArticleSummary: StudioArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			Status:             r.Status,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			PublishedAt:        pubAt,
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
			CategoryName:       catName,
			CategorySlug:       catSlug,
			Tags:               tagRefs,
		},
		Content:      r.Content,
		ContentHTML:  r.ContentHtml,
		CategoryID:   catID,
		CanonicalURL: canonical,
	}, nil
}

func (s *service) ListArticles(ctx context.Context, authorID uuid.UUID, status string, search string, page, perPage int) ([]StudioArticleSummary, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 10
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	if status == "" {
		status = "all"
	}
	search = strings.TrimSpace(search)

	authorUUID := pgtype.UUID{Bytes: authorID, Valid: true}

	rows, err := s.q.ListStudioArticles(ctx, db.ListStudioArticlesParams{
		AuthorID:  authorUUID,
		Status:    status,
		Search:    search,
		LimitVal:  limit,
		OffsetVal: offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.CountStudioArticles(ctx, db.CountStudioArticlesParams{
		AuthorID: authorUUID,
		Status:   status,
		Search:   search,
	})
	if err != nil {
		return nil, 0, err
	}

	items := make([]StudioArticleSummary, 0, len(rows))
	for _, r := range rows {
		var subtitle, cover, catName, catSlug *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.CategoryName.Valid {
			catName = &r.CategoryName.String
		}
		if r.CategorySlug.Valid {
			catSlug = &r.CategorySlug.String
		}
		var pubAt *time.Time
		if r.PublishedAt.Valid {
			pubAt = &r.PublishedAt.Time
		}

		// Retrieve tags for summary card
		articleID := r.ID
		tags, _ := s.q.GetArticleTags(ctx, articleID)
		tagRefs := make([]TagRef, 0, len(tags))
		for _, t := range tags {
			tagRefs = append(tagRefs, TagRef{
				ID:   uuid.UUID(t.ID.Bytes).String(),
				Name: t.Name,
				Slug: t.Slug,
			})
		}

		items = append(items, StudioArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			Status:             r.Status,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			PublishedAt:        pubAt,
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
			CategoryName:       catName,
			CategorySlug:       catSlug,
			Tags:               tagRefs,
		})
	}

	return items, total, nil
}

func (s *service) PublishArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	_, err := s.q.UpdateArticleStatus(ctx, db.UpdateArticleStatusParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		Status:   "published",
		AuthorID: pgtype.UUID{Bytes: authorID, Valid: true},
	})
	if err != nil {
		return nil, ErrArticleNotFound
	}

	return s.GetArticle(ctx, authorID, articleID)
}

func (s *service) ArchiveArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) (*StudioArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	_, err := s.q.UpdateArticleStatus(ctx, db.UpdateArticleStatusParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		Status:   "archived",
		AuthorID: pgtype.UUID{Bytes: authorID, Valid: true},
	})
	if err != nil {
		return nil, ErrArticleNotFound
	}

	return s.GetArticle(ctx, authorID, articleID)
}

func (s *service) DeleteArticle(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	return s.q.DeleteStudioArticle(ctx, db.DeleteStudioArticleParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		AuthorID: pgtype.UUID{Bytes: authorID, Valid: true},
	})
}

func (s *service) GetOverview(ctx context.Context, authorID uuid.UUID) (*StudioOverview, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	row, err := s.q.GetStudioOverview(ctx, pgtype.UUID{Bytes: authorID, Valid: true})
	if err != nil {
		return nil, err
	}

	return &StudioOverview{
		TotalArticles:  row.TotalArticles,
		PublishedCount: row.PublishedCount,
		DraftCount:     row.DraftCount,
		ArchivedCount:  row.ArchivedCount,
		TotalViews:     row.TotalViews,
		TotalLikes:     row.TotalLikes,
		TotalComments:  row.TotalComments,
		TotalBookmarks: row.TotalBookmarks,
	}, nil
}

// Helpers

func (s *service) renderMarkdown(source string) (string, error) {
	var buf bytes.Buffer
	if err := s.md.Convert([]byte(source), &buf); err != nil {
		return "", err
	}
	sanitized := s.sanitizer.Sanitize(buf.String())
	return sanitized, nil
}

func (s *service) generateUniqueSlug(ctx context.Context, title string, currentID uuid.UUID) (string, error) {
	base := formatSlug(title)
	if base == "" {
		base = "untitled-article"
	}

	slug := base
	for i := 0; i < 10; i++ {
		var taken bool
		var err error
		if currentID != uuid.Nil {
			taken, err = s.q.CheckArticleSlugExistsExceptID(ctx, db.CheckArticleSlugExistsExceptIDParams{
				Lower: slug,
				ID:    pgtype.UUID{Bytes: currentID, Valid: true},
			})
		} else {
			taken, err = s.q.CheckArticleSlugExists(ctx, slug)
		}
		if err != nil {
			return "", err
		}
		if !taken {
			return slug, nil
		}

		randomSuffix := randomHex(3)
		slug = fmt.Sprintf("%s-%s", base, randomSuffix)
	}

	return fmt.Sprintf("%s-%d", base, time.Now().Unix()), nil
}

func (s *service) syncArticleTags(ctx context.Context, articleID uuid.UUID, tagNames []string) error {
	articleUUID := pgtype.UUID{Bytes: articleID, Valid: true}
	_ = s.q.RemoveArticleTags(ctx, articleUUID)

	for _, raw := range tagNames {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		slug := formatSlug(trimmed)
		if slug == "" {
			continue
		}

		tag, err := s.q.UpsertTag(ctx, db.UpsertTagParams{
			Name: trimmed,
			Slug: slug,
		})
		if err != nil {
			continue
		}

		_ = s.q.AddArticleTag(ctx, db.AddArticleTagParams{
			ArticleID: articleUUID,
			TagID:     tag.ID,
		})
	}
	return nil
}

func calculateReadingTime(content string) int32 {
	words := len(strings.Fields(content))
	minutes := int32((words + 199) / 200)
	if minutes < 1 {
		return 1
	}
	return minutes
}

func formatSlug(input string) string {
	lower := strings.ToLower(input)
	clean := nonAlphanumericRegex.ReplaceAllString(lower, "-")
	clean = strings.Trim(clean, "-")
	if len(clean) > 80 {
		clean = clean[:80]
		clean = strings.Trim(clean, "-")
	}
	return clean
}

func randomHex(bytesLen int) string {
	b := make([]byte, bytesLen)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
