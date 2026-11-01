package search

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
)

type GlobalSearchResult struct {
	Query         string                   `json:"query"`
	Type          string                   `json:"type"`
	Articles      []content.ArticleSummary `json:"articles"`
	Authors       []content.AuthorSummary  `json:"authors"`
	ArticlesTotal int64                    `json:"articles_total"`
	AuthorsTotal  int64                    `json:"authors_total"`
}

type Service interface {
	SearchArticles(ctx context.Context, query, categorySlug, tagSlug, sortBy string, page, perPage int) ([]content.ArticleSummary, int64, error)
	SearchAuthors(ctx context.Context, query string, page, perPage int) ([]content.AuthorSummary, int64, error)
	ListPopularArticles(ctx context.Context, limit int) ([]content.ArticleSummary, error)
	GlobalSearch(ctx context.Context, query, searchType, categorySlug, tagSlug, sortBy string, page, perPage int) (*GlobalSearchResult, error)
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

func (s *service) SearchArticles(ctx context.Context, query, categorySlug, tagSlug, sortBy string, page, perPage int) ([]content.ArticleSummary, int64, error) {
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

	cleanQuery := strings.TrimSpace(query)
	cleanCategory := strings.TrimSpace(categorySlug)
	cleanTag := strings.TrimSpace(tagSlug)
	cleanSort := strings.ToLower(strings.TrimSpace(sortBy))

	// If no sort specified and query provided, default to 'relevance'; otherwise 'latest'
	if cleanSort == "" {
		if cleanQuery != "" {
			cleanSort = "relevance"
		} else {
			cleanSort = "latest"
		}
	}

	rows, err := s.q.SearchArticles(ctx, db.SearchArticlesParams{
		Query:        cleanQuery,
		CategorySlug: cleanCategory,
		TagSlug:      cleanTag,
		SortBy:       cleanSort,
		Lim:          limit,
		Off:          offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.CountSearchArticles(ctx, db.CountSearchArticlesParams{
		Query:        cleanQuery,
		CategorySlug: cleanCategory,
		TagSlug:      cleanTag,
	})
	if err != nil {
		total = int64(len(rows))
	}

	var articles []content.ArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar, headline *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
		}
		if r.AuthorHeadline.Valid {
			headline = &r.AuthorHeadline.String
		}

		var pubAt time.Time
		if r.PublishedAt.Valid {
			pubAt = r.PublishedAt.Time
		}

		var catRef *content.CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &content.CategoryRef{
				Name: r.CategoryName.String,
				Slug: r.CategorySlug.String,
			}
		}

		articles = append(articles, content.ArticleSummary{
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
			Author: content.AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
				Headline:    headline,
			},
			Category: catRef,
		})
	}

	return articles, total, nil
}

func (s *service) SearchAuthors(ctx context.Context, query string, page, perPage int) ([]content.AuthorSummary, int64, error) {
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

	cleanQuery := strings.TrimSpace(query)

	rows, err := s.q.SearchAuthors(ctx, db.SearchAuthorsParams{
		Query: cleanQuery,
		Lim:   limit,
		Off:   offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.CountSearchAuthors(ctx, cleanQuery)
	if err != nil {
		total = int64(len(rows))
	}

	var authors []content.AuthorSummary
	for _, r := range rows {
		var avatar, headline, bio *string
		if r.AvatarUrl.Valid {
			avatar = &r.AvatarUrl.String
		}
		if r.Headline.Valid {
			headline = &r.Headline.String
		}
		if r.Bio.Valid {
			bio = &r.Bio.String
		}

		var joinedAt time.Time
		if r.JoinedAt.Valid {
			joinedAt = r.JoinedAt.Time
		}

		authors = append(authors, content.AuthorSummary{
			UserID:         uuid.UUID(r.UserID.Bytes).String(),
			Username:       r.Username,
			DisplayName:    r.DisplayName,
			Headline:       headline,
			Bio:            bio,
			AvatarURL:      avatar,
			ArticleCount:   r.ArticleCount,
			FollowerCount:  r.FollowerCount,
			FollowingCount: r.FollowingCount,
			JoinedAt:       joinedAt,
		})
	}

	return authors, total, nil
}

func (s *service) ListPopularArticles(ctx context.Context, limit int) ([]content.ArticleSummary, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	if limit < 1 || limit > 50 {
		limit = 10
	}

	rows, err := s.q.ListPopularArticles(ctx, int32(limit))
	if err != nil {
		return nil, err
	}

	var articles []content.ArticleSummary
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

		var catRef *content.CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &content.CategoryRef{
				Name: r.CategoryName.String,
				Slug: r.CategorySlug.String,
			}
		}

		articles = append(articles, content.ArticleSummary{
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
			Author: content.AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}

	return articles, nil
}

func (s *service) GlobalSearch(ctx context.Context, query, searchType, categorySlug, tagSlug, sortBy string, page, perPage int) (*GlobalSearchResult, error) {
	searchType = strings.ToLower(strings.TrimSpace(searchType))
	if searchType == "" {
		searchType = "all"
	}

	result := &GlobalSearchResult{
		Query:    query,
		Type:     searchType,
		Articles: []content.ArticleSummary{},
		Authors:  []content.AuthorSummary{},
	}

	if searchType == "articles" || searchType == "all" {
		articles, total, err := s.SearchArticles(ctx, query, categorySlug, tagSlug, sortBy, page, perPage)
		if err != nil {
			return nil, err
		}
		result.Articles = articles
		result.ArticlesTotal = total
	}

	if searchType == "authors" || (searchType == "all" && query != "") {
		// When searching "all", return up to 5 top matching authors
		authorLimit := perPage
		if searchType == "all" {
			authorLimit = 5
		}
		authors, total, err := s.SearchAuthors(ctx, query, 1, authorLimit)
		if err != nil {
			return nil, err
		}
		result.Authors = authors
		result.AuthorsTotal = total
	}

	return result, nil
}

