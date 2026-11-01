package account

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/security"
)

var (
	ErrUserNotFound          = errors.New("user not found")
	ErrInvalidCurrentPassword = errors.New("current password is incorrect")
	ErrPasswordTooShort      = errors.New("new password must be at least 8 characters")
	ErrInvalidEmailFormat    = errors.New("invalid email address format")
	ErrEmailAlreadyTaken     = errors.New("email address is already in use")
	ErrUsernameAlreadyTaken  = errors.New("username handle is already in use")
	ErrInvalidFileFormat     = errors.New("uploaded file is not a supported image format (JPEG, PNG, WebP, GIF)")
	ErrFileTooLarge          = errors.New("file exceeds maximum allowed size (5MB for avatar, 10MB for cover)")
)

// ProfileInput represents fields allowed for user profile updates
type ProfileInput struct {
	DisplayName   string  `json:"display_name"`
	Username      string  `json:"username"`
	Headline      *string `json:"headline"`
	Bio           *string `json:"bio"`
	AvatarURL     *string `json:"avatar_url"`
	CoverImageURL *string `json:"cover_image_url"`
	Location      *string `json:"location"`
	GithubURL     *string `json:"github_url"`
	TwitterURL    *string `json:"twitter_url"`
	LinkedinURL   *string `json:"linkedin_url"`
	WebsiteURL    *string `json:"website_url"`
}

// UserSettings represents combined privacy, theme, and notification preferences
type UserSettings struct {
	ProfileVisibility    string `json:"profile_visibility"`
	ShowReadingHistory   bool   `json:"show_reading_history"`
	Theme                string `json:"theme"`
	EmailOnNewFollower   bool   `json:"email_on_new_follower"`
	EmailOnNewComment    bool   `json:"email_on_new_comment"`
	EmailOnReply         bool   `json:"email_on_reply"`
	EmailOnPublish       bool   `json:"email_on_article_publish"`
	InAppFollower        bool   `json:"in_app_follower"`
	InAppComment         bool   `json:"in_app_comment"`
	InAppLike            bool   `json:"in_app_like"`
	InAppMention         bool   `json:"in_app_mention"`
}

type ReadingHistoryItem struct {
	ID                  string    `json:"id"`
	ArticleID           string    `json:"article_id"`
	ArticleTitle        string    `json:"article_title"`
	ArticleSlug         string    `json:"article_slug"`
	ArticleSubtitle     *string   `json:"article_subtitle"`
	CoverImageURL       *string   `json:"cover_image_url"`
	ReadingTimeMinutes  int32     `json:"reading_time_minutes"`
	AuthorDisplayName   string    `json:"author_display_name"`
	AuthorUsername      string    `json:"author_username"`
	AuthorAvatarURL     *string   `json:"author_avatar_url"`
	ScrollPercentage    int       `json:"scroll_percentage"`
	ReadAt              time.Time `json:"read_at"`
}

type AchievementBadge struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IconName    string    `json:"icon_name"`
	BadgeColor  string    `json:"badge_color"`
	Points      int       `json:"points"`
	Unlocked    bool      `json:"unlocked"`
	UnlockedAt  *time.Time `json:"unlocked_at,omitempty"`
}

type ReputationOverview struct {
	Score        int                `json:"score"`
	Tier         string             `json:"tier"`
	NextTierXP   int                `json:"next_tier_xp"`
	Achievements []AchievementBadge `json:"achievements"`
}

type Service interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (map[string]any, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, input ProfileInput) (map[string]any, error)
	UploadMedia(ctx context.Context, userID uuid.UUID, fileHeader *multipart.FileHeader, mediaType string) (string, error)
	UpdateEmail(ctx context.Context, userID uuid.UUID, newEmail, currentPassword string) error
	ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error
	GetSettings(ctx context.Context, userID uuid.UUID) (*UserSettings, error)
	UpdateSettings(ctx context.Context, userID uuid.UUID, settings UserSettings) (*UserSettings, error)
	ListSessions(ctx context.Context, userID uuid.UUID) ([]map[string]any, error)
	RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error
	GetReadingHistory(ctx context.Context, userID uuid.UUID, page, perPage int) ([]ReadingHistoryItem, int64, error)
	RecordReadingHistory(ctx context.Context, userID, articleID uuid.UUID, scrollPercentage int) error
	DeleteReadingHistory(ctx context.Context, userID uuid.UUID, articleID *uuid.UUID) error
	GetReputation(ctx context.Context, userID uuid.UUID) (*ReputationOverview, error)
	DeactivateAccount(ctx context.Context, userID uuid.UUID, currentPassword string) error
	DeleteAccount(ctx context.Context, userID uuid.UUID, currentPassword string) error
}

type service struct {
	db  *database.DB
	q   *db.Queries
	cfg *config.Config
}

func NewService(db *database.DB, q *db.Queries, cfg *config.Config) Service {
	return &service{
		db:  db,
		q:   q,
		cfg: cfg,
	}
}

// -----------------------------------------------------------------------------
// 1. Profile Management
// -----------------------------------------------------------------------------

func (s *service) GetProfile(ctx context.Context, userID uuid.UUID) (map[string]any, error) {
	query := `
		SELECT 
			u.id, u.email, u.role, u.status, u.created_at as account_created_at,
			p.username, p.display_name, p.headline, p.bio, p.avatar_url, p.cover_image_url,
			p.github_url, p.twitter_url, p.linkedin_url, p.website_url, p.location,
			p.article_count, p.follower_count, p.following_count, p.reputation_score, p.reputation_tier,
			p.created_at as profile_created_at
		FROM users u
		LEFT JOIN profiles p ON u.id = p.user_id
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`

	var (
		uid                                        uuid.UUID
		email, role, status                        string
		accCreatedAt                               time.Time
		username, displayName                      *string
		headline, bio, avatar, cover               *string
		github, twitter, linkedin, website, loc    *string
		artCount, followerCount, followingCount    int
		repScore                                   int
		repTier                                    string
		profCreatedAt                              *time.Time
	)

	err := s.db.Pool.QueryRow(ctx, query, userID).Scan(
		&uid, &email, &role, &status, &accCreatedAt,
		&username, &displayName, &headline, &bio, &avatar, &cover,
		&github, &twitter, &linkedin, &website, &loc,
		&artCount, &followerCount, &followingCount, &repScore, &repTier,
		&profCreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	result := map[string]any{
		"id":                 uid.String(),
		"email":              email,
		"role":               role,
		"status":             status,
		"created_at":         accCreatedAt,
		"username":           username,
		"display_name":       displayName,
		"headline":           headline,
		"bio":                bio,
		"avatar_url":         avatar,
		"cover_image_url":    cover,
		"github_url":         github,
		"twitter_url":        twitter,
		"linkedin_url":       linkedin,
		"website_url":        website,
		"location":           loc,
		"article_count":      artCount,
		"follower_count":     followerCount,
		"following_count":    followingCount,
		"reputation_score":   repScore,
		"reputation_tier":    repTier,
	}

	return result, nil
}

func (s *service) UpdateProfile(ctx context.Context, userID uuid.UUID, input ProfileInput) (map[string]any, error) {
	cleanUsername := strings.ToLower(strings.TrimSpace(input.Username))
	cleanDisplayName := strings.TrimSpace(input.DisplayName)

	if cleanDisplayName == "" {
		cleanDisplayName = cleanUsername
	}

	// Check username uniqueness if changed
	if cleanUsername != "" {
		var existingUserID uuid.UUID
		err := s.db.Pool.QueryRow(ctx, `SELECT user_id FROM profiles WHERE lower(username) = lower($1) AND user_id != $2`, cleanUsername, userID).Scan(&existingUserID)
		if err == nil {
			return nil, ErrUsernameAlreadyTaken
		}
	}

	query := `
		UPDATE profiles
		SET 
			username = COALESCE(NULLIF($2, ''), username),
			display_name = COALESCE(NULLIF($3, ''), display_name),
			headline = $4,
			bio = $5,
			avatar_url = $6,
			cover_image_url = $7,
			location = $8,
			github_url = $9,
			twitter_url = $10,
			linkedin_url = $11,
			website_url = $12,
			updated_at = NOW()
		WHERE user_id = $1
	`

	_, err := s.db.Pool.Exec(ctx, query,
		userID,
		cleanUsername,
		cleanDisplayName,
		input.Headline,
		input.Bio,
		input.AvatarURL,
		input.CoverImageURL,
		input.Location,
		input.GithubURL,
		input.TwitterURL,
		input.LinkedinURL,
		input.WebsiteURL,
	)
	if err != nil {
		return nil, err
	}

	return s.GetProfile(ctx, userID)
}

// -----------------------------------------------------------------------------
// 2. Media Uploads (Avatar & Cover Banner)
// -----------------------------------------------------------------------------

func (s *service) UploadMedia(ctx context.Context, userID uuid.UUID, fileHeader *multipart.FileHeader, mediaType string) (string, error) {
	maxSize := int64(security.MaxAvatarSizeBytes)
	if mediaType == "cover" {
		maxSize = int64(security.MaxCoverSizeBytes)
	}

	if fileHeader.Size > maxSize {
		return "", ErrFileTooLarge
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}

	detectedMime, err := security.ValidateImageBytes(data, maxSize)
	if err != nil {
		return "", ErrInvalidFileFormat
	}

	safeFilename := security.SanitizeFilename(fileHeader.Filename, detectedMime)

	// Save to public uploads directory
	uploadDir := filepath.Join("public", "uploads", mediaType)
	_ = os.MkdirAll(uploadDir, 0755)

	targetPath := filepath.Join(uploadDir, safeFilename)
	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write media file: %w", err)
	}

	publicURL := fmt.Sprintf("/uploads/%s/%s", mediaType, safeFilename)

	// Update user profile record automatically
	if mediaType == "cover" {
		_, _ = s.db.Pool.Exec(ctx, `UPDATE profiles SET cover_image_url = $1, updated_at = NOW() WHERE user_id = $2`, publicURL, userID)
	} else {
		_, _ = s.db.Pool.Exec(ctx, `UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2`, publicURL, userID)
	}

	return publicURL, nil
}

// -----------------------------------------------------------------------------
// 3. Email & Password Security
// -----------------------------------------------------------------------------

func (s *service) UpdateEmail(ctx context.Context, userID uuid.UUID, newEmail, currentPassword string) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(newEmail))
	if _, err := mail.ParseAddress(cleanEmail); err != nil {
		return ErrInvalidEmailFormat
	}

	// Verify current password
	var passwordHash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&passwordHash)
	if err != nil {
		return ErrUserNotFound
	}

	match, err := security.VerifyPassword(currentPassword, passwordHash)
	if err != nil || !match {
		return ErrInvalidCurrentPassword
	}

	// Check if email already in use
	var existingID uuid.UUID
	err = s.db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE lower(email) = lower($1) AND id != $2`, cleanEmail, userID).Scan(&existingID)
	if err == nil {
		return ErrEmailAlreadyTaken
	}

	_, err = s.db.Pool.Exec(ctx, `UPDATE users SET email = $1, email_verified_at = NULL, updated_at = NOW() WHERE id = $2`, cleanEmail, userID)
	return err
}

func (s *service) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrPasswordTooShort
	}

	var passwordHash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&passwordHash)
	if err != nil {
		return ErrUserNotFound
	}

	match, err := security.VerifyPassword(currentPassword, passwordHash)
	if err != nil || !match {
		return ErrInvalidCurrentPassword
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password and revoke all active sessions
	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, newHash, userID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `DELETE FROM user_sessions WHERE user_id = $1`, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// -----------------------------------------------------------------------------
// 4. Preferences, Privacy & Themes
// -----------------------------------------------------------------------------

func (s *service) GetSettings(ctx context.Context, userID uuid.UUID) (*UserSettings, error) {
	settings := &UserSettings{
		ProfileVisibility:  "public",
		ShowReadingHistory: false,
		Theme:              "system",
		EmailOnNewFollower: true,
		EmailOnNewComment:  true,
		EmailOnReply:       true,
		EmailOnPublish:     true,
		InAppFollower:      true,
		InAppComment:       true,
		InAppLike:          true,
		InAppMention:       true,
	}

	// Fetch User Preferences
	_ = s.db.Pool.QueryRow(ctx, `
		SELECT profile_visibility, show_reading_history, theme
		FROM user_preferences WHERE user_id = $1
	`, userID).Scan(&settings.ProfileVisibility, &settings.ShowReadingHistory, &settings.Theme)

	// Fetch Notification Preferences
	_ = s.db.Pool.QueryRow(ctx, `
		SELECT 
			email_on_new_follower, email_on_new_comment, email_on_reply, email_on_article_publish,
			in_app_follower, in_app_comment, in_app_like, in_app_mention
		FROM notification_preferences WHERE user_id = $1
	`, userID).Scan(
		&settings.EmailOnNewFollower, &settings.EmailOnNewComment, &settings.EmailOnReply, &settings.EmailOnPublish,
		&settings.InAppFollower, &settings.InAppComment, &settings.InAppLike, &settings.InAppMention,
	)

	return settings, nil
}

func (s *service) UpdateSettings(ctx context.Context, userID uuid.UUID, settings UserSettings) (*UserSettings, error) {
	// Upsert user_preferences
	queryPref := `
		INSERT INTO user_preferences (user_id, profile_visibility, show_reading_history, theme, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			profile_visibility = EXCLUDED.profile_visibility,
			show_reading_history = EXCLUDED.show_reading_history,
			theme = EXCLUDED.theme,
			updated_at = NOW();
	`
	if _, err := s.db.Pool.Exec(ctx, queryPref, userID, settings.ProfileVisibility, settings.ShowReadingHistory, settings.Theme); err != nil {
		return nil, err
	}

	// Upsert notification_preferences
	queryNotif := `
		INSERT INTO notification_preferences (
			user_id, email_on_new_follower, email_on_new_comment, email_on_reply, email_on_article_publish,
			in_app_follower, in_app_comment, in_app_like, in_app_mention, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			email_on_new_follower = EXCLUDED.email_on_new_follower,
			email_on_new_comment = EXCLUDED.email_on_new_comment,
			email_on_reply = EXCLUDED.email_on_reply,
			email_on_article_publish = EXCLUDED.email_on_article_publish,
			in_app_follower = EXCLUDED.in_app_follower,
			in_app_comment = EXCLUDED.in_app_comment,
			in_app_like = EXCLUDED.in_app_like,
			in_app_mention = EXCLUDED.in_app_mention,
			updated_at = NOW();
	`
	if _, err := s.db.Pool.Exec(ctx, queryNotif,
		userID,
		settings.EmailOnNewFollower, settings.EmailOnNewComment, settings.EmailOnReply, settings.EmailOnPublish,
		settings.InAppFollower, settings.InAppComment, settings.InAppLike, settings.InAppMention,
	); err != nil {
		return nil, err
	}

	return s.GetSettings(ctx, userID)
}

// -----------------------------------------------------------------------------
// 5. Active Sessions Management
// -----------------------------------------------------------------------------

func (s *service) ListSessions(ctx context.Context, userID uuid.UUID) ([]map[string]any, error) {
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, ip_address, user_agent, created_at, expires_at
		FROM user_sessions
		WHERE user_id = $1 AND expires_at > NOW()
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]map[string]any, 0)
	for rows.Next() {
		var (
			id                               uuid.UUID
			ip, userAgent                    string
			createdAt, expiresAt             time.Time
		)
		if err := rows.Scan(&id, &ip, &userAgent, &createdAt, &expiresAt); err != nil {
			continue
		}
		sessions = append(sessions, map[string]any{
			"id":         id.String(),
			"ip_address": ip,
			"user_agent": userAgent,
			"created_at": createdAt,
			"expires_at": expiresAt,
		})
	}

	return sessions, nil
}

func (s *service) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error {
	_, err := s.db.Pool.Exec(ctx, `DELETE FROM user_sessions WHERE id = $1 AND user_id = $2`, sessionID, userID)
	return err
}

// -----------------------------------------------------------------------------
// 6. Reading History
// -----------------------------------------------------------------------------

func (s *service) GetReadingHistory(ctx context.Context, userID uuid.UUID, page, perPage int) ([]ReadingHistoryItem, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 10
	}
	offset := (page - 1) * perPage

	var total int64
	_ = s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM reading_history WHERE user_id = $1`, userID).Scan(&total)

	rows, err := s.db.Pool.Query(ctx, `
		SELECT 
			rh.id, rh.article_id, rh.scroll_percentage, rh.read_at,
			a.title, a.slug, a.subtitle, a.cover_image_url, a.reading_time_minutes,
			p.display_name, p.username, p.avatar_url
		FROM reading_history rh
		JOIN articles a ON rh.article_id = a.id
		JOIN profiles p ON a.author_id = p.user_id
		WHERE rh.user_id = $1 AND a.deleted_at IS NULL
		ORDER BY rh.read_at DESC
		LIMIT $2 OFFSET $3
	`, userID, perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]ReadingHistoryItem, 0)
	for rows.Next() {
		var (
			id, artID               uuid.UUID
			scroll                  int
			readAt                  time.Time
			title, slug             string
			sub, cover, avatar      *string
			readingTime             int32
			authorName, authorUser  string
		)
		if err := rows.Scan(
			&id, &artID, &scroll, &readAt,
			&title, &slug, &sub, &cover, &readingTime,
			&authorName, &authorUser, &avatar,
		); err != nil {
			continue
		}

		items = append(items, ReadingHistoryItem{
			ID:                 id.String(),
			ArticleID:          artID.String(),
			ArticleTitle:       title,
			ArticleSlug:        slug,
			ArticleSubtitle:    sub,
			CoverImageURL:      cover,
			ReadingTimeMinutes: readingTime,
			AuthorDisplayName:  authorName,
			AuthorUsername:     authorUser,
			AuthorAvatarURL:    avatar,
			ScrollPercentage:   scroll,
			ReadAt:             readAt,
		})
	}

	return items, total, nil
}

func (s *service) RecordReadingHistory(ctx context.Context, userID, articleID uuid.UUID, scrollPercentage int) error {
	query := `
		INSERT INTO reading_history (user_id, article_id, scroll_percentage, read_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id, article_id) DO UPDATE SET
			scroll_percentage = GREATEST(reading_history.scroll_percentage, EXCLUDED.scroll_percentage),
			read_at = NOW();
	`
	_, err := s.db.Pool.Exec(ctx, query, userID, articleID, scrollPercentage)
	return err
}

func (s *service) DeleteReadingHistory(ctx context.Context, userID uuid.UUID, articleID *uuid.UUID) error {
	if articleID != nil {
		_, err := s.db.Pool.Exec(ctx, `DELETE FROM reading_history WHERE user_id = $1 AND article_id = $2`, userID, *articleID)
		return err
	}
	_, err := s.db.Pool.Exec(ctx, `DELETE FROM reading_history WHERE user_id = $1`, userID)
	return err
}

// -----------------------------------------------------------------------------
// 7. Achievements & Reputation
// -----------------------------------------------------------------------------

func (s *service) GetReputation(ctx context.Context, userID uuid.UUID) (*ReputationOverview, error) {
	var score int
	var tier string

	err := s.db.Pool.QueryRow(ctx, `
		SELECT reputation_score, reputation_tier
		FROM profiles WHERE user_id = $1
	`, userID).Scan(&score, &tier)
	if err != nil {
		score = 100
		tier = "Apprentice"
	}

	// Calculate Next Tier XP
	nextXP := 500
	switch tier {
	case "Apprentice":
		nextXP = 500
	case "Practitioner":
		nextXP = 1500
	case "Architect":
		nextXP = 3000
	case "Principal":
		nextXP = 5000
	default:
		nextXP = 10000
	}

	// Get all definitions and map unlocked status for user
	rows, err := s.db.Pool.Query(ctx, `
		SELECT 
			ad.key, ad.name, ad.description, ad.icon_name, ad.badge_color, ad.points,
			ua.unlocked_at
		FROM achievement_definitions ad
		LEFT JOIN user_achievements ua ON ad.key = ua.achievement_key AND ua.user_id = $1
		ORDER BY ad.sort_order ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	badges := make([]AchievementBadge, 0)
	for rows.Next() {
		var (
			key, name, desc, icon, color string
			points                       int
			unlockedAt                   *time.Time
		)
		if err := rows.Scan(&key, &name, &desc, &icon, &color, &points, &unlockedAt); err != nil {
			continue
		}

		badges = append(badges, AchievementBadge{
			Key:         key,
			Name:        name,
			Description: desc,
			IconName:    icon,
			BadgeColor:  color,
			Points:      points,
			Unlocked:    unlockedAt != nil,
			UnlockedAt:  unlockedAt,
		})
	}

	return &ReputationOverview{
		Score:        score,
		Tier:         tier,
		NextTierXP:   nextXP,
		Achievements: badges,
	}, nil
}

// -----------------------------------------------------------------------------
// 8. Account Deactivation & Deletion (Danger Zone)
// -----------------------------------------------------------------------------

func (s *service) DeactivateAccount(ctx context.Context, userID uuid.UUID, currentPassword string) error {
	var passwordHash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&passwordHash)
	if err != nil {
		return ErrUserNotFound
	}

	match, err := security.VerifyPassword(currentPassword, passwordHash)
	if err != nil || !match {
		return ErrInvalidCurrentPassword
	}

	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE users SET status = 'deactivated', updated_at = NOW() WHERE id = $1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM user_sessions WHERE user_id = $1`, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *service) DeleteAccount(ctx context.Context, userID uuid.UUID, currentPassword string) error {
	var passwordHash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&passwordHash)
	if err != nil {
		return ErrUserNotFound
	}

	match, err := security.VerifyPassword(currentPassword, passwordHash)
	if err != nil || !match {
		return ErrInvalidCurrentPassword
	}

	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Anonymize and soft delete
	randomHash := uuid.NewString()
	if _, err := tx.Exec(ctx, `
		UPDATE users 
		SET status = 'deactivated', deleted_at = NOW(), email = concat(id::text, '@deleted.quorix.io'), password_hash = $1
		WHERE id = $2
	`, randomHash, userID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `DELETE FROM user_sessions WHERE user_id = $1`, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

