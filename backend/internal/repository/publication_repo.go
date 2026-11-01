package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

type PublicationRepository interface {
	CreatePublication(ctx context.Context, params db.CreatePublicationParams) (db.Publication, error)
	GetPublicationBySlug(ctx context.Context, slug string) (db.Publication, error)
	GetPublicationByID(ctx context.Context, id uuid.UUID) (db.Publication, error)
	AddPublicationMember(ctx context.Context, pubID, userID uuid.UUID, role string) (db.PublicationMember, error)
	GetPublicationMember(ctx context.Context, pubID, userID uuid.UUID) (db.PublicationMember, error)
	ListPublicationMembers(ctx context.Context, pubID uuid.UUID) ([]db.ListPublicationMembersRow, error)
}

type publicationRepo struct {
	q *db.Queries
}

func newPublicationRepository(q *db.Queries) PublicationRepository {
	return &publicationRepo{q: q}
}

func (r *publicationRepo) CreatePublication(ctx context.Context, params db.CreatePublicationParams) (db.Publication, error) {
	if r.q == nil {
		return db.Publication{}, nil
	}
	return r.q.CreatePublication(ctx, params)
}

func (r *publicationRepo) GetPublicationBySlug(ctx context.Context, slug string) (db.Publication, error) {
	if r.q == nil {
		return db.Publication{}, nil
	}
	return r.q.GetPublicationBySlug(ctx, slug)
}

func (r *publicationRepo) GetPublicationByID(ctx context.Context, id uuid.UUID) (db.Publication, error) {
	if r.q == nil {
		return db.Publication{}, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.GetPublicationByID(ctx, pgID)
}

func (r *publicationRepo) AddPublicationMember(ctx context.Context, pubID, userID uuid.UUID, role string) (db.PublicationMember, error) {
	if r.q == nil {
		return db.PublicationMember{}, nil
	}
	var pID, uID pgtype.UUID
	_ = pID.Scan(pubID.String())
	_ = uID.Scan(userID.String())
	return r.q.AddPublicationMember(ctx, db.AddPublicationMemberParams{
		PublicationID: pID,
		UserID:        uID,
		Role:          role,
	})
}

func (r *publicationRepo) GetPublicationMember(ctx context.Context, pubID, userID uuid.UUID) (db.PublicationMember, error) {
	if r.q == nil {
		return db.PublicationMember{}, nil
	}
	var pID, uID pgtype.UUID
	_ = pID.Scan(pubID.String())
	_ = uID.Scan(userID.String())
	return r.q.GetPublicationMember(ctx, db.GetPublicationMemberParams{
		PublicationID: pID,
		UserID:        uID,
	})
}

func (r *publicationRepo) ListPublicationMembers(ctx context.Context, pubID uuid.UUID) ([]db.ListPublicationMembersRow, error) {
	if r.q == nil {
		return nil, nil
	}
	var pID pgtype.UUID
	_ = pID.Scan(pubID.String())
	return r.q.ListPublicationMembers(ctx, pID)
}
