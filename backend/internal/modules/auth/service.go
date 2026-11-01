package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/security"
)

var (
	ErrInvalidCredentials     = errors.New("invalid email or password")
	ErrUserNotFound           = errors.New("user not found")
	ErrEmailAlreadyExists     = errors.New("email address is already registered")
	ErrUsernameAlreadyExists  = errors.New("username is already taken")
	ErrAccountSuspended       = errors.New("account is suspended. Please contact platform support")
	ErrInvalidOrExpiredToken  = errors.New("invalid, expired or already used token")
	ErrInvalidPasswordFormat  = errors.New("password must be at least 8 characters long")
	ErrInvalidEmailFormat     = errors.New("invalid email address format")
	ErrCurrentPasswordInvalid = errors.New("current password is incorrect")
)

type Service interface {
	Register(ctx context.Context, email, password, username, displayName string) (*RegisterResult, error)
	VerifyEmail(ctx context.Context, rawToken string) error
	ResendVerification(ctx context.Context, email string) (string, error)
	Login(ctx context.Context, email, password, userAgent, ipAddress string) (*AuthSessionResult, error)
	RefreshToken(ctx context.Context, rawRefreshToken, userAgent, ipAddress string) (*RefreshResult, error)
	Logout(ctx context.Context, rawRefreshToken string) error
	ForgotPassword(ctx context.Context, email string) (string, error)
	ResetPassword(ctx context.Context, rawToken, newPassword string) error
	ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error
	GetMe(ctx context.Context, userID uuid.UUID) (*UserWithProfile, error)
	ListSessions(ctx context.Context, userID uuid.UUID) ([]db.UserSession, error)
	RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error
}

type service struct {
	db  *database.DB
	q   *db.Queries
	cfg *config.Config
}

func NewService(d *database.DB, cfg *config.Config) Service {
	var q *db.Queries
	if d != nil && d.Pool != nil {
		q = db.New(d.Pool)
	}
	return &service{
		db:  d,
		q:   q,
		cfg: cfg,
	}
}

type RegisterResult struct {
	User              db.User
	Profile           db.Profile
	VerificationToken string
}

type AuthSessionResult struct {
	AccessToken  string
	RefreshToken string
	User         db.User
	Profile      db.Profile
}

type RefreshResult struct {
	AccessToken     string
	NewRefreshToken string
}

type UserWithProfile struct {
	User    db.User    `json:"user"`
	Profile db.Profile `json:"profile"`
}

func toTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

func toText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

func toUUID(u pgtype.UUID) uuid.UUID {
	return u.Bytes
}

func fromUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: u, Valid: u != uuid.Nil}
}

func (s *service) Register(ctx context.Context, email, password, username, displayName string) (*RegisterResult, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	username = strings.TrimSpace(strings.ToLower(username))
	displayName = strings.TrimSpace(displayName)

	if _, err := mail.ParseAddress(email); err != nil {
		return nil, ErrInvalidEmailFormat
	}
	if len(password) < 8 {
		return nil, ErrInvalidPasswordFormat
	}
	if len(username) < 3 || len(username) > 30 {
		return nil, errors.New("username must be between 3 and 30 characters")
	}
	if displayName == "" {
		displayName = username
	}

	if s.q == nil {
		return nil, errors.New("database connection not available")
	}

	// Check if email exists
	existingUser, _ := s.q.GetUserByEmail(ctx, email)
	if existingUser.Email != "" {
		return nil, ErrEmailAlreadyExists
	}

	// Check if username exists
	existingProfile, _ := s.q.GetProfileByUsername(ctx, username)
	if existingProfile.Username != "" {
		return nil, ErrUsernameAlreadyExists
	}

	passwordHash, err := security.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	rawToken, tokenHash, err := security.GenerateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate verification token: %w", err)
	}

	var createdUser db.User
	var createdProfile db.Profile

	err = s.db.WithTx(ctx, func(txQ *db.Queries) error {
		var err error
		createdUser, err = txQ.CreateUser(ctx, db.CreateUserParams{
			Email:        email,
			PasswordHash: passwordHash,
			Role:         "user",
			Status:       "pending_verification",
		})
		if err != nil {
			return fmt.Errorf("failed to create user record: %w", err)
		}

		createdProfile, err = txQ.CreateProfile(ctx, db.CreateProfileParams{
			UserID:      createdUser.ID,
			Username:    username,
			DisplayName: displayName,
		})
		if err != nil {
			return fmt.Errorf("failed to create profile: %w", err)
		}

		expiresAt := time.Now().UTC().Add(24 * time.Hour)
		_, err = txQ.CreateEmailVerificationToken(ctx, db.CreateEmailVerificationTokenParams{
			UserID:    createdUser.ID,
			TokenHash: tokenHash,
			ExpiresAt: toTimestamptz(expiresAt),
		})
		if err != nil {
			return fmt.Errorf("failed to store verification token: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	slog.Info("New user registered",
		slog.String("email", email),
		slog.String("username", username),
		slog.String("verification_token_dev", rawToken),
	)

	return &RegisterResult{
		User:              createdUser,
		Profile:           createdProfile,
		VerificationToken: rawToken,
	}, nil
}

func (s *service) VerifyEmail(ctx context.Context, rawToken string) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	tokenHash := security.HashToken(strings.TrimSpace(rawToken))
	tokenRecord, err := s.q.GetEmailVerificationToken(ctx, tokenHash)
	if err != nil || tokenRecord.TokenHash == "" {
		return ErrInvalidOrExpiredToken
	}

	err = s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.MarkEmailVerificationTokenUsed(ctx, tokenRecord.ID); err != nil {
			return err
		}
		return txQ.SetUserEmailVerified(ctx, tokenRecord.UserID)
	})

	return err
}

func (s *service) ResendVerification(ctx context.Context, email string) (string, error) {
	if s.q == nil {
		return "", errors.New("database not available")
	}

	user, err := s.q.GetUserByEmail(ctx, strings.TrimSpace(strings.ToLower(email)))
	if err != nil || user.Email == "" {
		// Silent return to prevent email enumeration
		return "", nil
	}

	if user.Status == "active" {
		return "", nil
	}

	rawToken, tokenHash, err := security.GenerateRandomToken(32)
	if err != nil {
		return "", err
	}

	err = s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.InvalidateUserVerificationTokens(ctx, user.ID); err != nil {
			return err
		}
		_, err := txQ.CreateEmailVerificationToken(ctx, db.CreateEmailVerificationTokenParams{
			UserID:    user.ID,
			TokenHash: tokenHash,
			ExpiresAt: toTimestamptz(time.Now().UTC().Add(24 * time.Hour)),
		})
		return err
	})

	slog.Info("Resent verification token", slog.String("email", email), slog.String("token_dev", rawToken))
	return rawToken, err
}

func (s *service) Login(ctx context.Context, email, password, userAgent, ipAddress string) (*AuthSessionResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	email = strings.TrimSpace(strings.ToLower(email))
	user, err := s.q.GetUserByEmail(ctx, email)
	if err != nil || user.Email == "" {
		return nil, ErrInvalidCredentials
	}

	if user.Status == "suspended" {
		return nil, ErrAccountSuspended
	}

	match, err := security.VerifyPassword(password, user.PasswordHash)
	if err != nil || !match {
		return nil, ErrInvalidCredentials
	}

	userUUID := toUUID(user.ID)

	accessToken, err := security.GenerateAccessToken(
		userUUID,
		user.Email,
		user.Role,
		s.cfg.JWT.AccessSecret,
		s.cfg.JWT.AccessTTL,
	)
	if err != nil {
		return nil, err
	}

	rawRefreshToken, refreshHash, err := security.GenerateRandomToken(32)
	if err != nil {
		return nil, err
	}

	_, err = s.q.CreateSession(ctx, db.CreateSessionParams{
		UserID:           user.ID,
		RefreshTokenHash: refreshHash,
		UserAgent:        toText(userAgent),
		ExpiresAt:        toTimestamptz(time.Now().UTC().Add(s.cfg.JWT.RefreshTTL)),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	_ = s.q.UpdateUserLastLogin(ctx, user.ID)

	profile, _ := s.q.GetProfileByUserID(ctx, user.ID)

	return &AuthSessionResult{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		User:         user,
		Profile:      profile,
	}, nil
}

func (s *service) RefreshToken(ctx context.Context, rawRefreshToken, userAgent, ipAddress string) (*RefreshResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	tokenHash := security.HashToken(strings.TrimSpace(rawRefreshToken))
	session, err := s.q.GetSessionByTokenHash(ctx, tokenHash)
	if err != nil || session.RefreshTokenHash == "" {
		return nil, errors.New("invalid or expired refresh token")
	}

	user, err := s.q.GetUserByID(ctx, session.UserID)
	if err != nil || user.Email == "" || user.Status == "suspended" {
		return nil, errors.New("user account is inactive")
	}

	userUUID := toUUID(user.ID)

	// Refresh token rotation: Revoke old session and issue new one
	newRawToken, newHash, err := security.GenerateRandomToken(32)
	if err != nil {
		return nil, err
	}

	err = s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.RevokeSession(ctx, session.ID); err != nil {
			return err
		}
		_, err := txQ.CreateSession(ctx, db.CreateSessionParams{
			UserID:           user.ID,
			RefreshTokenHash: newHash,
			UserAgent:        toText(userAgent),
			ExpiresAt:        toTimestamptz(time.Now().UTC().Add(s.cfg.JWT.RefreshTTL)),
		})
		return err
	})
	if err != nil {
		return nil, err
	}

	newAccessToken, err := security.GenerateAccessToken(
		userUUID,
		user.Email,
		user.Role,
		s.cfg.JWT.AccessSecret,
		s.cfg.JWT.AccessTTL,
	)
	if err != nil {
		return nil, err
	}

	return &RefreshResult{
		AccessToken:     newAccessToken,
		NewRefreshToken: newRawToken,
	}, nil
}

func (s *service) Logout(ctx context.Context, rawRefreshToken string) error {
	if s.q == nil || rawRefreshToken == "" {
		return nil
	}

	tokenHash := security.HashToken(strings.TrimSpace(rawRefreshToken))
	session, err := s.q.GetSessionByTokenHash(ctx, tokenHash)
	if err == nil && session.RefreshTokenHash != "" {
		_ = s.q.RevokeSession(ctx, session.ID)
	}
	return nil
}

func (s *service) ForgotPassword(ctx context.Context, email string) (string, error) {
	if s.q == nil {
		return "", errors.New("database not available")
	}

	user, err := s.q.GetUserByEmail(ctx, strings.TrimSpace(strings.ToLower(email)))
	if err != nil || user.Email == "" {
		// Return empty without error to prevent email enumeration
		return "", nil
	}

	rawToken, tokenHash, err := security.GenerateRandomToken(32)
	if err != nil {
		return "", err
	}

	err = s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.InvalidateUserPasswordResetTokens(ctx, user.ID); err != nil {
			return err
		}
		_, err := txQ.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
			UserID:    user.ID,
			TokenHash: tokenHash,
			ExpiresAt: toTimestamptz(time.Now().UTC().Add(1 * time.Hour)),
		})
		return err
	})

	slog.Info("Password reset token generated", slog.String("email", email), slog.String("reset_token_dev", rawToken))
	return rawToken, err
}

func (s *service) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrInvalidPasswordFormat
	}
	if s.q == nil {
		return errors.New("database not available")
	}

	tokenHash := security.HashToken(strings.TrimSpace(rawToken))
	resetRecord, err := s.q.GetPasswordResetToken(ctx, tokenHash)
	if err != nil || resetRecord.TokenHash == "" {
		return ErrInvalidOrExpiredToken
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
			ID:           resetRecord.UserID,
			PasswordHash: newHash,
		}); err != nil {
			return err
		}

		if err := txQ.MarkPasswordResetTokenUsed(ctx, resetRecord.ID); err != nil {
			return err
		}

		// Security: Invalidate all existing sessions upon password reset
		return txQ.RevokeAllUserSessions(ctx, resetRecord.UserID)
	})
}

func (s *service) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrInvalidPasswordFormat
	}
	if s.q == nil {
		return errors.New("database not available")
	}

	pgID := fromUUID(userID)

	user, err := s.q.GetUserByID(ctx, pgID)
	if err != nil || user.Email == "" {
		return ErrUserNotFound
	}

	match, err := security.VerifyPassword(currentPassword, user.PasswordHash)
	if err != nil || !match {
		return ErrCurrentPasswordInvalid
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.db.WithTx(ctx, func(txQ *db.Queries) error {
		if err := txQ.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
			ID:           pgID,
			PasswordHash: newHash,
		}); err != nil {
			return err
		}
		return txQ.RevokeAllUserSessions(ctx, pgID)
	})
}

func (s *service) GetMe(ctx context.Context, userID uuid.UUID) (*UserWithProfile, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	pgID := fromUUID(userID)

	user, err := s.q.GetUserByID(ctx, pgID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	profile, err := s.q.GetProfileByUserID(ctx, pgID)
	if err != nil {
		return nil, err
	}

	return &UserWithProfile{
		User:    user,
		Profile: profile,
	}, nil
}

func (s *service) ListSessions(ctx context.Context, userID uuid.UUID) ([]db.UserSession, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	pgID := fromUUID(userID)
	return s.q.ListActiveSessionsByUserID(ctx, pgID)
}

func (s *service) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	pgSessionID := fromUUID(sessionID)

	session, err := s.q.GetSessionByID(ctx, pgSessionID)
	if err != nil || session.RefreshTokenHash == "" {
		return errors.New("session not found")
	}

	sessionUserID := toUUID(session.UserID)
	if sessionUserID != userID {
		return errors.New("unauthorized to revoke this session")
	}

	return s.q.RevokeSession(ctx, pgSessionID)
}
