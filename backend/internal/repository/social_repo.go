package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

type SocialRepository interface {
	CreateComment(ctx context.Context, params db.CreateCommentParams) (db.Comment, error)
	ListCommentsByArticleID(ctx context.Context, articleID uuid.UUID) ([]db.ListCommentsByArticleIDRow, error)
	MarkCommentDeleted(ctx context.Context, id uuid.UUID) error
	CreateLike(ctx context.Context, userID, articleID uuid.UUID) (db.Like, error)
	DeleteLike(ctx context.Context, userID, articleID uuid.UUID) error
	HasUserLikedArticle(ctx context.Context, userID, articleID uuid.UUID) (bool, error)
	CreateBookmark(ctx context.Context, userID, articleID uuid.UUID) (db.Bookmark, error)
	DeleteBookmark(ctx context.Context, userID, articleID uuid.UUID) error
	HasUserBookmarkedArticle(ctx context.Context, userID, articleID uuid.UUID) (bool, error)
	ListBookmarksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]db.ListBookmarksByUserIDRow, error)
	CreateFollow(ctx context.Context, followerID, followingID uuid.UUID) (db.Follow, error)
	DeleteFollow(ctx context.Context, followerID, followingID uuid.UUID) error
	IsFollowing(ctx context.Context, followerID, followingID uuid.UUID) (bool, error)
}

type socialRepo struct {
	q *db.Queries
}

func newSocialRepository(q *db.Queries) SocialRepository {
	return &socialRepo{q: q}
}

func (r *socialRepo) CreateComment(ctx context.Context, params db.CreateCommentParams) (db.Comment, error) {
	if r.q == nil {
		return db.Comment{}, nil
	}
	return r.q.CreateComment(ctx, params)
}

func (r *socialRepo) ListCommentsByArticleID(ctx context.Context, articleID uuid.UUID) ([]db.ListCommentsByArticleIDRow, error) {
	if r.q == nil {
		return nil, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(articleID.String())
	return r.q.ListCommentsByArticleID(ctx, pgID)
}

func (r *socialRepo) MarkCommentDeleted(ctx context.Context, id uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.MarkCommentDeleted(ctx, pgID)
}

func (r *socialRepo) CreateLike(ctx context.Context, userID, articleID uuid.UUID) (db.Like, error) {
	if r.q == nil {
		return db.Like{}, nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.CreateLike(ctx, db.CreateLikeParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) DeleteLike(ctx context.Context, userID, articleID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.DeleteLike(ctx, db.DeleteLikeParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) HasUserLikedArticle(ctx context.Context, userID, articleID uuid.UUID) (bool, error) {
	if r.q == nil {
		return false, nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.HasUserLikedArticle(ctx, db.HasUserLikedArticleParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) CreateBookmark(ctx context.Context, userID, articleID uuid.UUID) (db.Bookmark, error) {
	if r.q == nil {
		return db.Bookmark{}, nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.CreateBookmark(ctx, db.CreateBookmarkParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) DeleteBookmark(ctx context.Context, userID, articleID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.DeleteBookmark(ctx, db.DeleteBookmarkParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) HasUserBookmarkedArticle(ctx context.Context, userID, articleID uuid.UUID) (bool, error) {
	if r.q == nil {
		return false, nil
	}
	var uID, aID pgtype.UUID
	_ = uID.Scan(userID.String())
	_ = aID.Scan(articleID.String())
	return r.q.HasUserBookmarkedArticle(ctx, db.HasUserBookmarkedArticleParams{
		UserID:    uID,
		ArticleID: aID,
	})
}

func (r *socialRepo) ListBookmarksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]db.ListBookmarksByUserIDRow, error) {
	if r.q == nil {
		return nil, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(userID.String())
	return r.q.ListBookmarksByUserID(ctx, db.ListBookmarksByUserIDParams{
		UserID: pgID,
		Limit:  limit,
		Offset: offset,
	})
}

func (r *socialRepo) CreateFollow(ctx context.Context, followerID, followingID uuid.UUID) (db.Follow, error) {
	if r.q == nil {
		return db.Follow{}, nil
	}
	var fID, gID pgtype.UUID
	_ = fID.Scan(followerID.String())
	_ = gID.Scan(followingID.String())
	return r.q.CreateFollow(ctx, db.CreateFollowParams{
		FollowerID:  fID,
		FollowingID: gID,
	})
}

func (r *socialRepo) DeleteFollow(ctx context.Context, followerID, followingID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var fID, gID pgtype.UUID
	_ = fID.Scan(followerID.String())
	_ = gID.Scan(followingID.String())
	return r.q.DeleteFollow(ctx, db.DeleteFollowParams{
		FollowerID:  fID,
		FollowingID: gID,
	})
}

func (r *socialRepo) IsFollowing(ctx context.Context, followerID, followingID uuid.UUID) (bool, error) {
	if r.q == nil {
		return false, nil
	}
	var fID, gID pgtype.UUID
	_ = fID.Scan(followerID.String())
	_ = gID.Scan(followingID.String())
	return r.q.IsFollowing(ctx, db.IsFollowingParams{
		FollowerID:  fID,
		FollowingID: gID,
	})
}

