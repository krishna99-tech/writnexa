package content

import (
	"context"
	"errors"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

var (
	ErrArticleNotFound  = errors.New("article not found")
	ErrCategoryNotFound = errors.New("category not found")
	ErrTagNotFound      = errors.New("tag not found")
	ErrAuthorNotFound   = errors.New("author not found")
	ErrInvalidUsername  = errors.New("username must be between 3 and 30 characters and contain only letters, numbers, and underscores")
	ErrUsernameTaken    = errors.New("username is already taken")
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

type ArticleSummary struct {
	ID                 string    `json:"id"`
	Title              string    `json:"title"`
	Slug               string    `json:"slug"`
	Subtitle           *string   `json:"subtitle,omitempty"`
	CoverImageURL      *string   `json:"cover_image_url,omitempty"`
	ReadingTimeMinutes int32     `json:"reading_time_minutes"`
	ViewsCount         int32     `json:"views_count"`
	LikesCount         int32     `json:"likes_count"`
	BookmarksCount     int32     `json:"bookmarks_count"`
	CommentsCount      int32     `json:"comments_count"`
	Featured           bool      `json:"featured"`
	PublishedAt        time.Time `json:"published_at"`
	Author             AuthorRef `json:"author"`
	Category           *CategoryRef `json:"category,omitempty"`
	Tags               []TagRef  `json:"tags,omitempty"`
}

type ArticleDetail struct {
	ArticleSummary
	Content     string  `json:"content"`
	ContentHTML string  `json:"content_html"`
	CanonicalURL *string `json:"canonical_url,omitempty"`
}

type AuthorRef struct {
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Headline    *string `json:"headline,omitempty"`
}

type CategoryRef struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type TagRef struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type AuthorSummary struct {
	UserID         string    `json:"user_id"`
	Username       string    `json:"username"`
	DisplayName    string    `json:"display_name"`
	Headline       *string   `json:"headline,omitempty"`
	Bio            *string   `json:"bio,omitempty"`
	AvatarURL      *string   `json:"avatar_url,omitempty"`
	ArticleCount   int32     `json:"article_count"`
	FollowerCount  int32     `json:"follower_count"`
	FollowingCount int32     `json:"following_count"`
	JoinedAt       time.Time `json:"joined_at"`
}

type AuthorDetail struct {
	AuthorSummary
	GithubURL   *string `json:"github_url,omitempty"`
	TwitterURL  *string `json:"twitter_url,omitempty"`
	LinkedinURL *string `json:"linkedin_url,omitempty"`
	WebsiteURL  *string `json:"website_url,omitempty"`
	Location    *string `json:"location,omitempty"`
}

type AuthorStats struct {
	TotalArticles  int64 `json:"total_articles"`
	TotalViews     int64 `json:"total_views"`
	TotalLikes     int64 `json:"total_likes"`
	TotalComments  int64 `json:"total_comments"`
	TotalBookmarks int64 `json:"total_bookmarks"`
	FollowerCount  int32 `json:"follower_count"`
	FollowingCount int32 `json:"following_count"`
}

type UpdateProfileInput struct {
	Username    *string `json:"username" binding:"omitempty,min=3,max=30"`
	DisplayName *string `json:"display_name" binding:"omitempty,min=2,max=100"`
	Headline    *string `json:"headline" binding:"omitempty,max=160"`
	Bio         *string `json:"bio" binding:"omitempty,max=2000"`
	AvatarURL   *string `json:"avatar_url" binding:"omitempty"`
	GithubURL   *string `json:"github_url" binding:"omitempty"`
	TwitterURL  *string `json:"twitter_url" binding:"omitempty"`
	LinkedinURL *string `json:"linkedin_url" binding:"omitempty"`
	WebsiteURL  *string `json:"website_url" binding:"omitempty"`
	Location    *string `json:"location" binding:"omitempty,max=100"`
}

type Service interface {
	ListPublishedArticles(ctx context.Context, page, perPage int, sort string, categorySlug, tagSlug string) ([]ArticleSummary, int64, error)
	GetArticleBySlug(ctx context.Context, slug string) (*ArticleDetail, error)
	ListFeaturedArticles(ctx context.Context, limit int) ([]ArticleSummary, error)
	ListTrendingArticles(ctx context.Context, limit int) ([]ArticleSummary, error)
	SearchArticles(ctx context.Context, query string, page, perPage int) ([]ArticleSummary, int64, error)
	ListCategories(ctx context.Context) ([]db.Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (*db.Category, error)
	ListTags(ctx context.Context, limit, offset int) ([]db.Tag, error)
	GetTagBySlug(ctx context.Context, slug string) (*db.Tag, error)
	ListAuthors(ctx context.Context, page, perPage int) ([]AuthorSummary, int64, error)
	GetAuthorProfile(ctx context.Context, username string) (*AuthorDetail, error)
	GetAuthorProfileByUserID(ctx context.Context, userID uuid.UUID) (*AuthorDetail, error)
	ListAuthorArticles(ctx context.Context, username string, page, perPage int) ([]ArticleSummary, int64, error)
	GetAuthorStats(ctx context.Context, username string) (*AuthorStats, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, input UpdateProfileInput) (*AuthorDetail, error)
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

func (s *service) ListPublishedArticles(ctx context.Context, page, perPage int, sort string, categorySlug, tagSlug string) ([]ArticleSummary, int64, error) {
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

	// Filter by Category
	if categorySlug != "" {
		rows, err := s.q.ListArticlesByCategory(ctx, db.ListArticlesByCategoryParams{
			Slug:   categorySlug,
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			return nil, 0, err
		}
		total, _ := s.q.CountArticlesByCategory(ctx, categorySlug)
		return mapCategoryRows(rows), total, nil
	}

	// Filter by Tag
	if tagSlug != "" {
		rows, err := s.q.ListArticlesByTag(ctx, db.ListArticlesByTagParams{
			Slug:   tagSlug,
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			return nil, 0, err
		}
		total, _ := s.q.CountArticlesByTag(ctx, tagSlug)
		return mapTagRows(rows), total, nil
	}

	// Trending sort
	if sort == "trending" {
		rows, err := s.q.ListTrendingArticles(ctx, limit)
		if err != nil {
			return nil, 0, err
		}
		total, _ := s.q.CountPublishedArticles(ctx)
		return mapTrendingRows(rows), total, nil
	}

	// Default: Latest published
	rows, err := s.q.ListPublishedArticles(ctx, db.ListPublishedArticlesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, err
	}
	total, _ := s.q.CountPublishedArticles(ctx)
	return mapPublishedRows(rows), total, nil
}

func (s *service) GetArticleBySlug(ctx context.Context, slug string) (*ArticleDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	row, err := s.q.GetArticleBySlug(ctx, slug)
	if err != nil {
		return nil, ErrArticleNotFound
	}

	// Asynchronously increment views count
	go func(id pgtype.UUID) {
		_ = s.q.IncrementArticleViews(context.Background(), id)
	}(row.ID)

	// Fetch tags
	tags, _ := s.q.GetArticleTags(ctx, row.ID)
	var tagRefs []TagRef
	for _, t := range tags {
		tagRefs = append(tagRefs, TagRef{Name: t.Name, Slug: t.Slug})
	}

	var pubAt time.Time
	if row.PublishedAt.Valid {
		pubAt = row.PublishedAt.Time
	}

	var subtitle, cover, canonical, headline *string
	if row.Subtitle.Valid {
		subtitle = &row.Subtitle.String
	}
	if row.CoverImageUrl.Valid {
		cover = &row.CoverImageUrl.String
	}
	if row.CanonicalUrl.Valid {
		canonical = &row.CanonicalUrl.String
	}
	if row.AuthorHeadline.Valid {
		headline = &row.AuthorHeadline.String
	}

	var catRef *CategoryRef
	if row.CategoryName.Valid && row.CategorySlug.Valid {
		catRef = &CategoryRef{
			Name: row.CategoryName.String,
			Slug: row.CategorySlug.String,
		}
	}

	var avatarURL *string
	if row.AuthorAvatarUrl.Valid {
		avatarURL = &row.AuthorAvatarUrl.String
	}

	return &ArticleDetail{
		ArticleSummary: ArticleSummary{
			ID:                 uuid.UUID(row.ID.Bytes).String(),
			Title:              row.Title,
			Slug:               row.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: row.ReadingTimeMinutes,
			ViewsCount:         row.ViewsCount,
			LikesCount:         row.LikesCount,
			BookmarksCount:     row.BookmarksCount,
			CommentsCount:      row.CommentsCount,
			Featured:           row.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    row.AuthorUsername,
				DisplayName: row.AuthorDisplayName,
				AvatarURL:   avatarURL,
				Headline:    headline,
			},
			Category: catRef,
			Tags:     tagRefs,
		},
		Content:      row.Content,
		ContentHTML:  row.ContentHtml,
		CanonicalURL: canonical,
	}, nil
}

func (s *service) ListFeaturedArticles(ctx context.Context, limit int) ([]ArticleSummary, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	if limit < 1 || limit > 20 {
		limit = 6
	}

	rows, err := s.q.ListFeaturedArticles(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapFeaturedRows(rows), nil
}

func (s *service) ListTrendingArticles(ctx context.Context, limit int) ([]ArticleSummary, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	if limit < 1 || limit > 20 {
		limit = 6
	}

	rows, err := s.q.ListTrendingArticles(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapTrendingRows(rows), nil
}

func (s *service) SearchArticles(ctx context.Context, query string, page, perPage int) ([]ArticleSummary, int64, error) {
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

	rows, err := s.q.SearchPublishedArticles(ctx, db.SearchPublishedArticlesParams{
		PlaintoTsquery: query,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, _ := s.q.CountSearchPublishedArticles(ctx, query)

	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		var avatar *string
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}

		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}

	return list, total, nil
}

func (s *service) ListCategories(ctx context.Context) ([]db.Category, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	return s.q.ListCategories(ctx)
}

func (s *service) GetCategoryBySlug(ctx context.Context, slug string) (*db.Category, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	c, err := s.q.GetCategoryBySlug(ctx, slug)
	if err != nil {
		return nil, ErrCategoryNotFound
	}
	return &c, nil
}

func (s *service) ListTags(ctx context.Context, limit, offset int) ([]db.Tag, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	return s.q.ListTags(ctx, db.ListTagsParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
}

func (s *service) GetTagBySlug(ctx context.Context, slug string) (*db.Tag, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}
	t, err := s.q.GetTagBySlug(ctx, slug)
	if err != nil {
		return nil, ErrTagNotFound
	}
	return &t, nil
}

func (s *service) ListAuthors(ctx context.Context, page, perPage int) ([]AuthorSummary, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 12
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	rows, err := s.q.ListPublicAuthors(ctx, db.ListPublicAuthorsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, _ := s.q.CountPublicAuthors(ctx)

	var authors []AuthorSummary
	for _, r := range rows {
		// Omit internal system administration accounts from public author directory
		if r.Username == "admin" || r.Role == "super_admin" || r.DisplayName == "System Administrator" {
			continue
		}
		var headline, bio, avatar *string
		if r.Headline.Valid {
			headline = &r.Headline.String
		}
		if r.Bio.Valid {
			bio = &r.Bio.String
		}
		if r.AvatarUrl.Valid {
			avatar = &r.AvatarUrl.String
		}
		var joined time.Time
		if r.CreatedAt.Valid {
			joined = r.CreatedAt.Time
		}

		authors = append(authors, AuthorSummary{
			UserID:         uuid.UUID(r.UserID.Bytes).String(),
			Username:       r.Username,
			DisplayName:    r.DisplayName,
			Headline:       headline,
			Bio:            bio,
			AvatarURL:      avatar,
			ArticleCount:   r.ArticleCount,
			FollowerCount:  r.FollowerCount,
			FollowingCount: r.FollowingCount,
			JoinedAt:       joined,
		})
	}

	return authors, total, nil
}

func (s *service) GetAuthorProfile(ctx context.Context, username string) (*AuthorDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	r, err := s.q.GetProfileByUsername(ctx, username)
	if err != nil {
		return nil, ErrAuthorNotFound
	}

	return profileToAuthorDetail(r), nil
}

func (s *service) GetAuthorProfileByUserID(ctx context.Context, userID uuid.UUID) (*AuthorDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	r, err := s.q.GetProfileByUserID(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	if err != nil {
		return nil, ErrAuthorNotFound
	}

	return profileToAuthorDetail(r), nil
}

func (s *service) GetAuthorStats(ctx context.Context, username string) (*AuthorStats, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	profile, err := s.q.GetProfileByUsername(ctx, username)
	if err != nil {
		return nil, ErrAuthorNotFound
	}

	statsRow, err := s.q.GetAuthorArticleStats(ctx, username)
	if err != nil {
		return nil, err
	}

	return &AuthorStats{
		TotalArticles:  statsRow.TotalArticles,
		TotalViews:     statsRow.TotalViews,
		TotalLikes:     statsRow.TotalLikes,
		TotalComments:  statsRow.TotalComments,
		TotalBookmarks: statsRow.TotalBookmarks,
		FollowerCount:  profile.FollowerCount,
		FollowingCount: profile.FollowingCount,
	}, nil
}

func (s *service) UpdateProfile(ctx context.Context, userID uuid.UUID, input UpdateProfileInput) (*AuthorDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// Validate username format if supplied
	if input.Username != nil && *input.Username != "" {
		if !usernameRegex.MatchString(*input.Username) {
			return nil, ErrInvalidUsername
		}

		taken, err := s.q.CheckUsernameExistsExceptUser(ctx, db.CheckUsernameExistsExceptUserParams{
			Lower:  *input.Username,
			UserID: pgUserID,
		})
		if err != nil {
			return nil, err
		}
		if taken {
			return nil, ErrUsernameTaken
		}
	}

	params := db.UpdateProfileFullParams{
		UserID: pgUserID,
	}

	if input.Username != nil && *input.Username != "" {
		params.Username = pgtype.Text{String: *input.Username, Valid: true}
	}
	if input.DisplayName != nil && *input.DisplayName != "" {
		params.DisplayName = pgtype.Text{String: *input.DisplayName, Valid: true}
	}
	if input.Headline != nil {
		params.Headline = pgtype.Text{String: *input.Headline, Valid: true}
	}
	if input.Bio != nil {
		params.Bio = pgtype.Text{String: *input.Bio, Valid: true}
	}
	if input.AvatarURL != nil {
		params.AvatarUrl = pgtype.Text{String: *input.AvatarURL, Valid: true}
	}
	if input.GithubURL != nil {
		params.GithubUrl = pgtype.Text{String: *input.GithubURL, Valid: true}
	}
	if input.TwitterURL != nil {
		params.TwitterUrl = pgtype.Text{String: *input.TwitterURL, Valid: true}
	}
	if input.LinkedinURL != nil {
		params.LinkedinUrl = pgtype.Text{String: *input.LinkedinURL, Valid: true}
	}
	if input.WebsiteURL != nil {
		params.WebsiteUrl = pgtype.Text{String: *input.WebsiteURL, Valid: true}
	}
	if input.Location != nil {
		params.Location = pgtype.Text{String: *input.Location, Valid: true}
	}

	updated, err := s.q.UpdateProfileFull(ctx, params)
	if err != nil {
		return nil, err
	}

	return profileToAuthorDetail(updated), nil
}

func profileToAuthorDetail(r db.Profile) *AuthorDetail {
	var headline, bio, avatar, gh, tw, li, web, loc *string
	if r.Headline.Valid {
		headline = &r.Headline.String
	}
	if r.Bio.Valid {
		bio = &r.Bio.String
	}
	if r.AvatarUrl.Valid {
		avatar = &r.AvatarUrl.String
	}
	if r.GithubUrl.Valid {
		gh = &r.GithubUrl.String
	}
	if r.TwitterUrl.Valid {
		tw = &r.TwitterUrl.String
	}
	if r.LinkedinUrl.Valid {
		li = &r.LinkedinUrl.String
	}
	if r.WebsiteUrl.Valid {
		web = &r.WebsiteUrl.String
	}
	if r.Location.Valid {
		loc = &r.Location.String
	}
	var joined time.Time
	if r.CreatedAt.Valid {
		joined = r.CreatedAt.Time
	}

	return &AuthorDetail{
		AuthorSummary: AuthorSummary{
			UserID:         uuid.UUID(r.UserID.Bytes).String(),
			Username:       r.Username,
			DisplayName:    r.DisplayName,
			Headline:       headline,
			Bio:            bio,
			AvatarURL:      avatar,
			ArticleCount:   r.ArticleCount,
			FollowerCount:  r.FollowerCount,
			FollowingCount: r.FollowingCount,
			JoinedAt:       joined,
		},
		GithubURL:   gh,
		TwitterURL:  tw,
		LinkedinURL: li,
		WebsiteURL:  web,
		Location:    loc,
	}
}

func (s *service) ListAuthorArticles(ctx context.Context, username string, page, perPage int) ([]ArticleSummary, int64, error) {
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

	rows, err := s.q.ListArticlesByAuthor(ctx, db.ListArticlesByAuthorParams{
		Username: username,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		return nil, 0, err
	}
	total, _ := s.q.CountArticlesByAuthor(ctx, username)
	return mapAuthorArticleRows(rows), total, nil
}

// Helpers to map query rows into clean API ArticleSummary models
func mapPublishedRows(rows []db.ListPublishedArticlesRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		list = append(list, mapSinglePublishedRow(r))
	}
	return list
}

func mapSinglePublishedRow(r db.ListPublishedArticlesRow) ArticleSummary {
	var subtitle, cover, avatar *string
	if r.Subtitle.Valid {
		subtitle = &r.Subtitle.String
	}
	if r.CoverImageUrl.Valid {
		cover = &r.CoverImageUrl.String
	}
	if r.AuthorAvatarUrl.Valid {
		avatar = &r.AuthorAvatarUrl.String
	}
	var pubAt time.Time
	if r.PublishedAt.Valid {
		pubAt = r.PublishedAt.Time
	}
	var catRef *CategoryRef
	if r.CategoryName.Valid && r.CategorySlug.Valid {
		catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
	}
	return ArticleSummary{
		ID:                 uuid.UUID(r.ID.Bytes).String(),
		Title:              r.Title,
		Slug:               r.Slug,
		Subtitle:           subtitle,
		CoverImageURL:      cover,
		ReadingTimeMinutes: r.ReadingTimeMinutes,
		ViewsCount:         r.ViewsCount,
		LikesCount:         r.LikesCount,
		BookmarksCount:     r.BookmarksCount,
		CommentsCount:      r.CommentsCount,
		Featured:           r.Featured,
		PublishedAt:        pubAt,
		Author: AuthorRef{
			Username:    r.AuthorUsername,
			DisplayName: r.AuthorDisplayName,
			AvatarURL:   avatar,
		},
		Category: catRef,
	}
}

func mapFeaturedRows(rows []db.ListFeaturedArticlesRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}
	return list
}

func mapTrendingRows(rows []db.ListTrendingArticlesRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}
	return list
}

func mapCategoryRows(rows []db.ListArticlesByCategoryRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}
	return list
}

func mapTagRows(rows []db.ListArticlesByTagRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}
	return list
}

func mapAuthorArticleRows(rows []db.ListArticlesByAuthorRow) []ArticleSummary {
	var list []ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}
		var catRef *CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &CategoryRef{Name: r.CategoryName.String, Slug: r.CategorySlug.String}
		}
		list = append(list, ArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			Title:              r.Title,
			Slug:               r.Slug,
			Subtitle:           subtitle,
			CoverImageURL:      cover,
			ReadingTimeMinutes: r.ReadingTimeMinutes,
			ViewsCount:         r.ViewsCount,
			LikesCount:         r.LikesCount,
			BookmarksCount:     r.BookmarksCount,
			CommentsCount:      r.CommentsCount,
			Featured:           r.Featured,
			PublishedAt:        pubAt,
			Author: AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}
	return list
}
