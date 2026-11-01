package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

type UserRepository interface {
	CreateUser(ctx context.Context, params db.CreateUserParams) (db.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error)
	GetUserByEmail(ctx context.Context, email string) (db.User, error)
	UpdateUserStatus(ctx context.Context, id uuid.UUID, status string) (db.User, error)
	UpdateUserLastLogin(ctx context.Context, id uuid.UUID) error
	SoftDeleteUser(ctx context.Context, id uuid.UUID) error
}

type userRepo struct {
	q *db.Queries
}

func newUserRepository(q *db.Queries) UserRepository {
	return &userRepo{q: q}
}

func (r *userRepo) CreateUser(ctx context.Context, params db.CreateUserParams) (db.User, error) {
	if r.q == nil {
		return db.User{}, nil
	}
	return r.q.CreateUser(ctx, params)
}

func (r *userRepo) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	if r.q == nil {
		return db.User{}, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.GetUserByID(ctx, pgID)
}

func (r *userRepo) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	if r.q == nil {
		return db.User{}, nil
	}
	return r.q.GetUserByEmail(ctx, email)
}

func (r *userRepo) UpdateUserStatus(ctx context.Context, id uuid.UUID, status string) (db.User, error) {
	if r.q == nil {
		return db.User{}, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.UpdateUserStatus(ctx, db.UpdateUserStatusParams{
		ID:     pgID,
		Status: status,
	})
}

func (r *userRepo) UpdateUserLastLogin(ctx context.Context, id uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.UpdateUserLastLogin(ctx, pgID)
}

func (r *userRepo) SoftDeleteUser(ctx context.Context, id uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(id.String())
	return r.q.SoftDeleteUser(ctx, pgID)
}

// ProfileRepository
type ProfileRepository interface {
	CreateProfile(ctx context.Context, params db.CreateProfileParams) (db.Profile, error)
	GetProfileByUserID(ctx context.Context, userID uuid.UUID) (db.Profile, error)
	GetProfileByUsername(ctx context.Context, username string) (db.Profile, error)
	UpdateProfile(ctx context.Context, params db.UpdateProfileParams) (db.Profile, error)
}

type profileRepo struct {
	q *db.Queries
}

func newProfileRepository(q *db.Queries) ProfileRepository {
	return &profileRepo{q: q}
}

func (r *profileRepo) CreateProfile(ctx context.Context, params db.CreateProfileParams) (db.Profile, error) {
	if r.q == nil {
		return db.Profile{}, nil
	}
	return r.q.CreateProfile(ctx, params)
}

func (r *profileRepo) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (db.Profile, error) {
	if r.q == nil {
		return db.Profile{}, nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(userID.String())
	return r.q.GetProfileByUserID(ctx, pgID)
}

func (r *profileRepo) GetProfileByUsername(ctx context.Context, username string) (db.Profile, error) {
	if r.q == nil {
		return db.Profile{}, nil
	}
	return r.q.GetProfileByUsername(ctx, username)
}

func (r *profileRepo) UpdateProfile(ctx context.Context, params db.UpdateProfileParams) (db.Profile, error) {
	if r.q == nil {
		return db.Profile{}, nil
	}
	return r.q.UpdateProfile(ctx, params)
}

// SessionRepository
type SessionRepository interface {
	CreateSession(ctx context.Context, params db.CreateSessionParams) (db.UserSession, error)
	GetSessionByTokenHash(ctx context.Context, hash string) (db.UserSession, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
	RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error
}

type sessionRepo struct {
	q *db.Queries
}

func newSessionRepository(q *db.Queries) SessionRepository {
	return &sessionRepo{q: q}
}

func (r *sessionRepo) CreateSession(ctx context.Context, params db.CreateSessionParams) (db.UserSession, error) {
	if r.q == nil {
		return db.UserSession{}, nil
	}
	return r.q.CreateSession(ctx, params)
}

func (r *sessionRepo) GetSessionByTokenHash(ctx context.Context, hash string) (db.UserSession, error) {
	if r.q == nil {
		return db.UserSession{}, nil
	}
	return r.q.GetSessionByTokenHash(ctx, hash)
}

func (r *sessionRepo) RevokeSession(ctx context.Context, sessionID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(sessionID.String())
	return r.q.RevokeSession(ctx, pgID)
}

func (r *sessionRepo) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	if r.q == nil {
		return nil
	}
	var pgID pgtype.UUID
	_ = pgID.Scan(userID.String())
	return r.q.RevokeAllUserSessions(ctx, pgID)
}
