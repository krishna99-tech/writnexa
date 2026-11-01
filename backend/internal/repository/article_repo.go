package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

type ArticleRepository interface {
	CreateArticle(ctx context.Context, params db.CreateArticleParams) (db.Article, error)
	GetArticleByID(ctx context.Context, id uuid.UUID) (db.Article, error)
	GetArticleBySlug(ctx context.Context, slug string) (db.GetArticleBySlugRow, error)
	UpdateArticle(ctx context.Context, params db.UpdateArticleParams) (db.Article, error)
	SoftDeleteArticle(ctx context.Context, id uuid.UUID) error
	ListPublishedArticles(ctx context.Context, limit, offset int32) ([]db.ListPublishedArticlesRow, error)
	ListFeaturedArticles(ctx context.Context, limit int32) ([]db.ListFeaturedArticlesRow, error)
	IncrementArticleViews(ctx context.Context, id uuid.UUID) error
	AddArticleTag(ctx context.Context, articleID, tagID uuid.UUID) error
	GetArticleTags(ctx context.Context, articleID uuid.UUID) ([]db.Tag, error)
}

type articleRepo struct {
	q *db.Queries
}

func newArticleRepository(q *db.Queries) ArticleRepository {
	return &articleRepo{q: q}
}

func (r *articleRepo) CreateArticle(ctx context.Context, params db.CreateArticleParams) (db.Article, error) {
	if r.q == nil {
		return db.Article{}, nil
	}
	return r.q.CreateArticle(ctx, params)
}

func (r *articleRepo) GetArticleByID(ctx context.Context, id uuid.UUID) (db.Article, error) {
	if r.q == nil {
		return db.Article{}, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.GetArticleByID(ctx, pgID)
}

func (r *articleRepo) GetArticleBySlug(ctx context.Context, slug string) (db.GetArticleBySlugRow, error) {
	if r.q == nil {
		return db.GetArticleBySlugRow{}, nil
	}
	return r.q.GetArticleBySlug(ctx, slug)
}

func (r *articleRepo) UpdateArticle(ctx context.Context, params db.UpdateArticleParams) (db.Article, error) {
	if r.q == nil {
		return db.Article{}, nil
	}
	return r.q.UpdateArticle(ctx, params)
}

func (r *articleRepo) SoftDeleteArticle(ctx context.Context, id uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.SoftDeleteArticle(ctx, pgID)
}

func (r *articleRepo) ListPublishedArticles(ctx context.Context, limit, offset int32) ([]db.ListPublishedArticlesRow, error) {
	if r.q == nil {
		return nil, nil
	}
	return r.q.ListPublishedArticles(ctx, db.ListPublishedArticlesParams{
		Limit:  limit,
		Offset: offset,
	})
}

func (r *articleRepo) ListFeaturedArticles(ctx context.Context, limit int32) ([]db.ListFeaturedArticlesRow, error) {
	if r.q == nil {
		return nil, nil
	}
	return r.q.ListFeaturedArticles(ctx, limit)
}

func (r *articleRepo) IncrementArticleViews(ctx context.Context, id uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.IncrementArticleViews(ctx, pgID)
}

func (r *articleRepo) AddArticleTag(ctx context.Context, articleID, tagID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var aID, tID pgtype.UUID
	_ = aID.Scan(articleID.String())
	_ = tID.Scan(tagID.String())
	return r.q.AddArticleTag(ctx, db.AddArticleTagParams{
		ArticleID: aID,
		TagID:     tID,
	})
}

func (r *articleRepo) GetArticleTags(ctx context.Context, articleID uuid.UUID) ([]db.Tag, error) {
	if r.q == nil {
		return nil, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(articleID.String())
	return r.q.GetArticleTags(ctx, pgID)
}

// CategoryRepository
type CategoryRepository interface {
	CreateCategory(ctx context.Context, params db.CreateCategoryParams) (db.Category, error)
	ListCategories(ctx context.Context) ([]db.Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (db.Category, error)
}

type categoryRepo struct {
	q *db.Queries
}

func newCategoryRepository(q *db.Queries) CategoryRepository {
	return &categoryRepo{q: q}
}

func (r *categoryRepo) CreateCategory(ctx context.Context, params db.CreateCategoryParams) (db.Category, error) {
	if r.q == nil {
		return db.Category{}, nil
	}
	return r.q.CreateCategory(ctx, params)
}

func (r *categoryRepo) ListCategories(ctx context.Context) ([]db.Category, error) {
	if r.q == nil {
		return nil, nil
	}
	return r.q.ListCategories(ctx)
}

func (r *categoryRepo) GetCategoryBySlug(ctx context.Context, slug string) (db.Category, error) {
	if r.q == nil {
		return db.Category{}, nil
	}
	return r.q.GetCategoryBySlug(ctx, slug)
}

// TagRepository
type TagRepository interface {
	CreateTag(ctx context.Context, params db.CreateTagParams) (db.Tag, error)
	ListTags(ctx context.Context, limit, offset int32) ([]db.Tag, error)
	GetTagBySlug(ctx context.Context, slug string) (db.Tag, error)
	IncrementTagUsage(ctx context.Context, id uuid.UUID, delta int32) error
}

type tagRepo struct {
	q *db.Queries
}

func newTagRepository(q *db.Queries) TagRepository {
	return &tagRepo{q: q}
}

func (r *tagRepo) CreateTag(ctx context.Context, params db.CreateTagParams) (db.Tag, error) {
	if r.q == nil {
		return db.Tag{}, nil
	}
	return r.q.CreateTag(ctx, params)
}

func (r *tagRepo) ListTags(ctx context.Context, limit, offset int32) ([]db.Tag, error) {
	if r.q == nil {
		return nil, nil
	}
	return r.q.ListTags(ctx, db.ListTagsParams{
		Limit:  limit,
		Offset: offset,
	})
}

func (r *tagRepo) GetTagBySlug(ctx context.Context, slug string) (db.Tag, error) {
	if r.q == nil {
		return db.Tag{}, nil
	}
	return r.q.GetTagBySlug(ctx, slug)
}

func (r *tagRepo) IncrementTagUsage(ctx context.Context, id uuid.UUID, delta int32) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.IncrementTagUsage(ctx, db.IncrementTagUsageParams{
		ID:         pgID,
		UsageCount: delta,
	})
}

