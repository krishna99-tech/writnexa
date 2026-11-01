package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

var (
	ErrUserNotFound        = errors.New("user not found")
	ErrArticleNotFound     = errors.New("article not found")
	ErrReportNotFound      = errors.New("moderation report not found")
	ErrSuperAdminRequired  = errors.New("only a super_admin can modify administrative roles or accounts")
	ErrInvalidStatus       = errors.New("invalid account or report status")
	ErrInvalidRole         = errors.New("invalid user role specified")
)

type DashboardStats struct {
	TotalUsers           int64 `json:"total_users"`
	NewRegistrations7d   int64 `json:"new_registrations_7d"`
	NewRegistrations30d  int64 `json:"new_registrations_30d"`
	TotalAuthors         int64 `json:"total_authors"`
	PublishedArticles    int64 `json:"published_articles"`
	DraftArticles        int64 `json:"draft_articles"`
	ArchivedArticles     int64 `json:"archived_articles"`
	TotalComments        int64 `json:"total_comments"`
	TotalViews           int64 `json:"total_views"`
	DailyActiveUsers     int64 `json:"daily_active_users"`
	MonthlyActiveUsers   int64 `json:"monthly_active_users"`
	PendingReports       int64 `json:"pending_reports"`
}

type AdminUserSummary struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	Status         string    `json:"status"`
	EmailVerified  bool      `json:"email_verified"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Username       *string   `json:"username,omitempty"`
	DisplayName    *string   `json:"display_name,omitempty"`
	AvatarURL      *string   `json:"avatar_url,omitempty"`
	Headline       *string   `json:"headline,omitempty"`
	ArticleCount   int32     `json:"article_count"`
	FollowerCount  int32     `json:"follower_count"`
	FollowingCount int32     `json:"following_count"`
}

type AdminUserDetail struct {
	AdminUserSummary
	Bio                 *string `json:"bio,omitempty"`
	GithubURL           *string `json:"github_url,omitempty"`
	TwitterURL          *string `json:"twitter_url,omitempty"`
	LinkedinURL         *string `json:"linkedin_url,omitempty"`
	WebsiteURL          *string `json:"website_url,omitempty"`
	Location            *string `json:"location,omitempty"`
	ActiveSessionsCount int32   `json:"active_sessions_count"`
}

type AdminArticleSummary struct {
	ID                 string     `json:"id"`
	AuthorID           string     `json:"author_id"`
	CategoryID         *string    `json:"category_id,omitempty"`
	Title              string     `json:"title"`
	Slug               string     `json:"slug"`
	Subtitle           *string    `json:"subtitle,omitempty"`
	CoverImageURL      *string    `json:"cover_image_url,omitempty"`
	ReadingTimeMinutes int32      `json:"reading_time_minutes"`
	ViewsCount         int32      `json:"views_count"`
	LikesCount         int32      `json:"likes_count"`
	BookmarksCount     int32      `json:"bookmarks_count"`
	CommentsCount      int32      `json:"comments_count"`
	Featured           bool       `json:"featured"`
	Status             string     `json:"status"`
	PublishedAt        *time.Time `json:"published_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	AuthorUsername     string     `json:"author_username"`
	AuthorDisplayName  string     `json:"author_display_name"`
	AuthorAvatarURL    *string    `json:"author_avatar_url,omitempty"`
	CategoryName       *string    `json:"category_name,omitempty"`
	CategorySlug       *string    `json:"category_slug,omitempty"`
}

type AuditLogItem struct {
	ID                string          `json:"id"`
	ActorID           *string         `json:"actor_id,omitempty"`
	ActorEmail        string          `json:"actor_email"`
	ActorRole         string          `json:"actor_role"`
	Action            string          `json:"action"`
	TargetType        string          `json:"target_type"`
	TargetID          *string         `json:"target_id,omitempty"`
	Details           json.RawMessage `json:"details"`
	IPAddress         *string         `json:"ip_address,omitempty"`
	UserAgent         *string         `json:"user_agent,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	ActorUsername     *string         `json:"actor_username,omitempty"`
	ActorDisplayName  *string         `json:"actor_display_name,omitempty"`
}

type ModerationReportItem struct {
	ID                  string     `json:"id"`
	ReporterID          *string    `json:"reporter_id,omitempty"`
	TargetType          string     `json:"target_type"`
	TargetID            string     `json:"target_id"`
	Reason              string     `json:"reason"`
	Details             *string    `json:"details,omitempty"`
	Status              string     `json:"status"`
	ResolvedBy          *string    `json:"resolved_by,omitempty"`
	ResolutionNotes     *string    `json:"resolution_notes,omitempty"`
	ResolvedAt          *time.Time `json:"resolved_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	ReporterUsername    *string    `json:"reporter_username,omitempty"`
	ReporterDisplayName *string    `json:"reporter_display_name,omitempty"`
	ResolverUsername    *string    `json:"resolver_username,omitempty"`
	ResolverDisplayName *string    `json:"resolver_display_name,omitempty"`
}

type PlatformSettingItem struct {
	Key         string     `json:"key"`
	Value       string     `json:"value"`
	Description *string    `json:"description,omitempty"`
	UpdatedBy   *string    `json:"updated_by,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Service interface {
	GetDashboardStats(ctx context.Context) (*DashboardStats, error)
	ListUsers(ctx context.Context, query, role, status string, page, perPage int) ([]AdminUserSummary, int64, error)
	GetUserDetail(ctx context.Context, id uuid.UUID) (*AdminUserDetail, error)
	UpdateUserStatus(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, targetID uuid.UUID, newStatus string, ip, ua string) error
	UpdateUserRole(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, targetID uuid.UUID, newRole string, ip, ua string) error

	ListArticles(ctx context.Context, query, status string, page, perPage int) ([]AdminArticleSummary, int64, error)
	ToggleFeatureArticle(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, articleID uuid.UUID, featured bool, ip, ua string) error
	ArchiveArticle(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, articleID uuid.UUID, ip, ua string) error

	ListAuditLogs(ctx context.Context, action, targetType string, page, perPage int) ([]AuditLogItem, int64, error)
	ListModerationReports(ctx context.Context, status, targetType string, page, perPage int) ([]ModerationReportItem, int64, error)
	CreateModerationReport(ctx context.Context, reporterID uuid.UUID, targetType string, targetID uuid.UUID, reason, details string) (*ModerationReportItem, error)
	ResolveModerationReport(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, reportID uuid.UUID, status, notes string, ip, ua string) error

	ListPlatformSettings(ctx context.Context) ([]PlatformSettingItem, error)
	UpdatePlatformSetting(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, key, value string, ip, ua string) error
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

func (s *service) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	row, err := s.q.GetAdminDashboardStats(ctx)
	if err != nil {
		return nil, err
	}

	return &DashboardStats{
		TotalUsers:          row.TotalUsers,
		NewRegistrations7d:  row.NewRegistrations7d,
		NewRegistrations30d: row.NewRegistrations30d,
		TotalAuthors:        row.TotalAuthors,
		PublishedArticles:   row.PublishedArticles,
		DraftArticles:       row.DraftArticles,
		ArchivedArticles:    row.ArchivedArticles,
		TotalComments:       row.TotalComments,
		TotalViews:          row.TotalViews,
		DailyActiveUsers:    row.DailyActiveUsers,
		MonthlyActiveUsers:  row.MonthlyActiveUsers,
		PendingReports:      row.PendingReports,
	}, nil
}

func (s *service) ListUsers(ctx context.Context, query, role, status string, page, perPage int) ([]AdminUserSummary, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	rows, err := s.q.AdminListUsers(ctx, db.AdminListUsersParams{
		Query:  strings.TrimSpace(query),
		Role:   strings.TrimSpace(role),
		Status: strings.TrimSpace(status),
		Lim:    limit,
		Off:    offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.AdminCountUsers(ctx, db.AdminCountUsersParams{
		Query:  strings.TrimSpace(query),
		Role:   strings.TrimSpace(role),
		Status: strings.TrimSpace(status),
	})
	if err != nil {
		total = int64(len(rows))
	}

	var users []AdminUserSummary
	for _, r := range rows {
		var username, displayName, avatar, headline *string
		if r.Username.Valid {
			username = &r.Username.String
		}
		if r.DisplayName.Valid {
			displayName = &r.DisplayName.String
		}
		if r.AvatarUrl.Valid {
			avatar = &r.AvatarUrl.String
		}
		if r.Headline.Valid {
			headline = &r.Headline.String
		}

		users = append(users, AdminUserSummary{
			ID:             uuid.UUID(r.ID.Bytes).String(),
			Email:          r.Email,
			Role:           r.Role,
			Status:         r.Status,
			EmailVerified:  r.EmailVerified,
			CreatedAt:      r.CreatedAt.Time,
			UpdatedAt:      r.UpdatedAt.Time,
			Username:       username,
			DisplayName:    displayName,
			AvatarURL:      avatar,
			Headline:       headline,
			ArticleCount:   r.ArticleCount.Int32,
			FollowerCount:  r.FollowerCount.Int32,
			FollowingCount: r.FollowingCount.Int32,
		})
	}

	return users, total, nil
}

func (s *service) GetUserDetail(ctx context.Context, id uuid.UUID) (*AdminUserDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	r, err := s.q.AdminGetUserDetail(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		return nil, ErrUserNotFound
	}

	var username, displayName, avatar, headline, bio, github, twitter, linkedin, website, location *string
	if r.Username.Valid {
		username = &r.Username.String
	}
	if r.DisplayName.Valid {
		displayName = &r.DisplayName.String
	}
	if r.AvatarUrl.Valid {
		avatar = &r.AvatarUrl.String
	}
	if r.Headline.Valid {
		headline = &r.Headline.String
	}
	if r.Bio.Valid {
		bio = &r.Bio.String
	}
	if r.GithubUrl.Valid {
		github = &r.GithubUrl.String
	}
	if r.TwitterUrl.Valid {
		twitter = &r.TwitterUrl.String
	}
	if r.LinkedinUrl.Valid {
		linkedin = &r.LinkedinUrl.String
	}
	if r.WebsiteUrl.Valid {
		website = &r.WebsiteUrl.String
	}
	if r.Location.Valid {
		location = &r.Location.String
	}

	return &AdminUserDetail{
		AdminUserSummary: AdminUserSummary{
			ID:             uuid.UUID(r.ID.Bytes).String(),
			Email:          r.Email,
			Role:           r.Role,
			Status:         r.Status,
			EmailVerified:  r.EmailVerified,
			CreatedAt:      r.CreatedAt.Time,
			UpdatedAt:      r.UpdatedAt.Time,
			Username:       username,
			DisplayName:    displayName,
			AvatarURL:      avatar,
			Headline:       headline,
			ArticleCount:   r.ArticleCount.Int32,
			FollowerCount:  r.FollowerCount.Int32,
			FollowingCount: r.FollowingCount.Int32,
		},
		Bio:                 bio,
		GithubURL:           github,
		TwitterURL:          twitter,
		LinkedinURL:         linkedin,
		WebsiteURL:          website,
		Location:            location,
		ActiveSessionsCount: r.ActiveSessionsCount,
	}, nil
}

func (s *service) UpdateUserStatus(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, targetID uuid.UUID, newStatus string, ip, ua string) error {
	validStatuses := map[string]bool{"active": true, "suspended": true, "deactivated": true}
	if !validStatuses[newStatus] {
		return ErrInvalidStatus
	}

	target, err := s.GetUserDetail(ctx, targetID)
	if err != nil {
		return err
	}

	// Super admin accounts cannot be suspended except by super_admin
	if (target.Role == "admin" || target.Role == "super_admin") && actorRole != "super_admin" {
		return ErrSuperAdminRequired
	}

	if err := s.q.AdminUpdateUserStatus(ctx, db.AdminUpdateUserStatusParams{
		ID:     pgtype.UUID{Bytes: targetID, Valid: true},
		Status: newStatus,
	}); err != nil {
		return err
	}

	// Record Audit Log
	detailsJSON, _ := json.Marshal(map[string]interface{}{
		"previous_status": target.Status,
		"new_status":      newStatus,
		"target_email":    target.Email,
	})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     fmt.Sprintf("user.status_%s", newStatus),
		TargetType: "user",
		TargetID:   pgtype.Text{String: targetID.String(), Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

func (s *service) UpdateUserRole(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, targetID uuid.UUID, newRole string, ip, ua string) error {
	validRoles := map[string]bool{"user": true, "author": true, "moderator": true, "admin": true, "super_admin": true}
	if !validRoles[newRole] {
		return ErrInvalidRole
	}

	target, err := s.GetUserDetail(ctx, targetID)
	if err != nil {
		return err
	}

	// Critical Rule: Only super_admin can grant admin/super_admin or alter an admin/super_admin
	if (newRole == "admin" || newRole == "super_admin" || target.Role == "admin" || target.Role == "super_admin") && actorRole != "super_admin" {
		return ErrSuperAdminRequired
	}

	if err := s.q.AdminUpdateUserRole(ctx, db.AdminUpdateUserRoleParams{
		ID:   pgtype.UUID{Bytes: targetID, Valid: true},
		Role: newRole,
	}); err != nil {
		return err
	}

	// Record Audit Log
	detailsJSON, _ := json.Marshal(map[string]interface{}{
		"previous_role": target.Role,
		"new_role":      newRole,
		"target_email":  target.Email,
	})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     "user.role_change",
		TargetType: "user",
		TargetID:   pgtype.Text{String: targetID.String(), Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

func (s *service) ListArticles(ctx context.Context, query, status string, page, perPage int) ([]AdminArticleSummary, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	rows, err := s.q.AdminListArticles(ctx, db.AdminListArticlesParams{
		Query:  strings.TrimSpace(query),
		Status: strings.TrimSpace(status),
		Lim:    limit,
		Off:    offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.AdminCountArticles(ctx, db.AdminCountArticlesParams{
		Query:  strings.TrimSpace(query),
		Status: strings.TrimSpace(status),
	})
	if err != nil {
		total = int64(len(rows))
	}

	var articles []AdminArticleSummary
	for _, r := range rows {
		var subtitle, cover, avatar, catName, catSlug *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}
		if r.AuthorAvatarUrl.Valid {
			avatar = &r.AuthorAvatarUrl.String
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

		var catID *string
		if r.CategoryID.Valid {
			idStr := uuid.UUID(r.CategoryID.Bytes).String()
			catID = &idStr
		}

		articles = append(articles, AdminArticleSummary{
			ID:                 uuid.UUID(r.ID.Bytes).String(),
			AuthorID:           uuid.UUID(r.AuthorID.Bytes).String(),
			CategoryID:         catID,
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
			Status:             r.Status,
			PublishedAt:        pubAt,
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
			AuthorUsername:     r.AuthorUsername,
			AuthorDisplayName:  r.AuthorDisplayName,
			AuthorAvatarURL:    avatar,
			CategoryName:       catName,
			CategorySlug:       catSlug,
		})
	}

	return articles, total, nil
}

func (s *service) ToggleFeatureArticle(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, articleID uuid.UUID, featured bool, ip, ua string) error {
	if err := s.q.AdminToggleFeatureArticle(ctx, db.AdminToggleFeatureArticleParams{
		ID:       pgtype.UUID{Bytes: articleID, Valid: true},
		Featured: featured,
	}); err != nil {
		return err
	}

	action := "article.feature"
	if !featured {
		action = "article.unfeature"
	}

	detailsJSON, _ := json.Marshal(map[string]interface{}{"featured": featured})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     action,
		TargetType: "article",
		TargetID:   pgtype.Text{String: articleID.String(), Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

func (s *service) ArchiveArticle(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, articleID uuid.UUID, ip, ua string) error {
	if err := s.q.AdminArchiveArticle(ctx, pgtype.UUID{Bytes: articleID, Valid: true}); err != nil {
		return err
	}

	detailsJSON, _ := json.Marshal(map[string]interface{}{"reason": "Administrative moderation action"})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     "article.archive",
		TargetType: "article",
		TargetID:   pgtype.Text{String: articleID.String(), Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

func (s *service) ListAuditLogs(ctx context.Context, action, targetType string, page, perPage int) ([]AuditLogItem, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 25
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	rows, err := s.q.AdminListAuditLogs(ctx, db.AdminListAuditLogsParams{
		Action:     strings.TrimSpace(action),
		TargetType: strings.TrimSpace(targetType),
		Lim:        limit,
		Off:        offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.AdminCountAuditLogs(ctx, db.AdminCountAuditLogsParams{
		Action:     strings.TrimSpace(action),
		TargetType: strings.TrimSpace(targetType),
	})
	if err != nil {
		total = int64(len(rows))
	}

	var logs []AuditLogItem
	for _, r := range rows {
		var actorIDStr, targetIDStr, ipStr, uaStr, username, displayName *string
		if r.ActorID.Valid {
			id := uuid.UUID(r.ActorID.Bytes).String()
			actorIDStr = &id
		}
		if r.TargetID.Valid {
			targetIDStr = &r.TargetID.String
		}
		if r.IpAddress.Valid {
			ipStr = &r.IpAddress.String
		}
		if r.UserAgent.Valid {
			uaStr = &r.UserAgent.String
		}
		if r.ActorUsername.Valid {
			username = &r.ActorUsername.String
		}
		if r.ActorDisplayName.Valid {
			displayName = &r.ActorDisplayName.String
		}

		logs = append(logs, AuditLogItem{
			ID:               uuid.UUID(r.ID.Bytes).String(),
			ActorID:          actorIDStr,
			ActorEmail:       r.ActorEmail,
			ActorRole:        r.ActorRole,
			Action:           r.Action,
			TargetType:       r.TargetType,
			TargetID:         targetIDStr,
			Details:          r.Details,
			IPAddress:        ipStr,
			UserAgent:        uaStr,
			CreatedAt:        r.CreatedAt.Time,
			ActorUsername:    username,
			ActorDisplayName: displayName,
		})
	}

	return logs, total, nil
}

func (s *service) ListModerationReports(ctx context.Context, status, targetType string, page, perPage int) ([]ModerationReportItem, int64, error) {
	if s.q == nil {
		return nil, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	rows, err := s.q.AdminListModerationReports(ctx, db.AdminListModerationReportsParams{
		Status:     strings.TrimSpace(status),
		TargetType: strings.TrimSpace(targetType),
		Lim:        limit,
		Off:        offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, err := s.q.AdminCountModerationReports(ctx, db.AdminCountModerationReportsParams{
		Status:     strings.TrimSpace(status),
		TargetType: strings.TrimSpace(targetType),
	})
	if err != nil {
		total = int64(len(rows))
	}

	var reports []ModerationReportItem
	for _, r := range rows {
		var repIDStr, resIDStr, detailsStr, notesStr, repUser, repName, resUser, resName *string
		if r.ReporterID.Valid {
			id := uuid.UUID(r.ReporterID.Bytes).String()
			repIDStr = &id
		}
		if r.ResolvedBy.Valid {
			id := uuid.UUID(r.ResolvedBy.Bytes).String()
			resIDStr = &id
		}
		if r.Details.Valid {
			detailsStr = &r.Details.String
		}
		if r.ResolutionNotes.Valid {
			notesStr = &r.ResolutionNotes.String
		}
		if r.ReporterUsername.Valid {
			repUser = &r.ReporterUsername.String
		}
		if r.ReporterDisplayName.Valid {
			repName = &r.ReporterDisplayName.String
		}
		if r.ResolverUsername.Valid {
			resUser = &r.ResolverUsername.String
		}
		if r.ResolverDisplayName.Valid {
			resName = &r.ResolverDisplayName.String
		}

		var resAt *time.Time
		if r.ResolvedAt.Valid {
			resAt = &r.ResolvedAt.Time
		}

		reports = append(reports, ModerationReportItem{
			ID:                  uuid.UUID(r.ID.Bytes).String(),
			ReporterID:          repIDStr,
			TargetType:          r.TargetType,
			TargetID:            uuid.UUID(r.TargetID.Bytes).String(),
			Reason:              r.Reason,
			Details:             detailsStr,
			Status:              r.Status,
			ResolvedBy:          resIDStr,
			ResolutionNotes:     notesStr,
			ResolvedAt:          resAt,
			CreatedAt:           r.CreatedAt.Time,
			UpdatedAt:           r.UpdatedAt.Time,
			ReporterUsername:    repUser,
			ReporterDisplayName: repName,
			ResolverUsername:    resUser,
			ResolverDisplayName: resName,
		})
	}

	return reports, total, nil
}

func (s *service) CreateModerationReport(ctx context.Context, reporterID uuid.UUID, targetType string, targetID uuid.UUID, reason, details string) (*ModerationReportItem, error) {
	row, err := s.q.CreateModerationReport(ctx, db.CreateModerationReportParams{
		ReporterID: pgtype.UUID{Bytes: reporterID, Valid: true},
		TargetType: targetType,
		TargetID:   pgtype.UUID{Bytes: targetID, Valid: true},
		Reason:     reason,
		Details:    pgtype.Text{String: details, Valid: details != ""},
	})
	if err != nil {
		return nil, err
	}

	var repIDStr, detailsStr *string
	if row.ReporterID.Valid {
		id := uuid.UUID(row.ReporterID.Bytes).String()
		repIDStr = &id
	}
	if row.Details.Valid {
		detailsStr = &row.Details.String
	}

	return &ModerationReportItem{
		ID:         uuid.UUID(row.ID.Bytes).String(),
		ReporterID: repIDStr,
		TargetType: row.TargetType,
		TargetID:   uuid.UUID(row.TargetID.Bytes).String(),
		Reason:     row.Reason,
		Details:    detailsStr,
		Status:     row.Status,
		CreatedAt:  row.CreatedAt.Time,
		UpdatedAt:  row.UpdatedAt.Time,
	}, nil
}

func (s *service) ResolveModerationReport(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, reportID uuid.UUID, status, notes string, ip, ua string) error {
	validStatuses := map[string]bool{"reviewed": true, "dismissed": true, "action_taken": true}
	if !validStatuses[status] {
		return ErrInvalidStatus
	}

	if err := s.q.AdminResolveModerationReport(ctx, db.AdminResolveModerationReportParams{
		ID:              pgtype.UUID{Bytes: reportID, Valid: true},
		Status:          status,
		ResolvedBy:      pgtype.UUID{Bytes: actorID, Valid: true},
		ResolutionNotes: pgtype.Text{String: notes, Valid: notes != ""},
	}); err != nil {
		return err
	}

	detailsJSON, _ := json.Marshal(map[string]interface{}{"status": status, "notes": notes})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     fmt.Sprintf("report.%s", status),
		TargetType: "moderation_report",
		TargetID:   pgtype.Text{String: reportID.String(), Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

func (s *service) ListPlatformSettings(ctx context.Context) ([]PlatformSettingItem, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	rows, err := s.q.ListPlatformSettings(ctx)
	if err != nil {
		return nil, err
	}

	var list []PlatformSettingItem
	for _, r := range rows {
		var desc, updater *string
		if r.Description.Valid {
			desc = &r.Description.String
		}
		if r.UpdatedBy.Valid {
			id := uuid.UUID(r.UpdatedBy.Bytes).String()
			updater = &id
		}

		list = append(list, PlatformSettingItem{
			Key:         r.Key,
			Value:       r.Value,
			Description: desc,
			UpdatedBy:   updater,
			UpdatedAt:   r.UpdatedAt.Time,
		})
	}

	return list, nil
}

func (s *service) UpdatePlatformSetting(ctx context.Context, actorID uuid.UUID, actorEmail, actorRole string, key, value string, ip, ua string) error {
	// Only super_admin can change platform configurations
	if actorRole != "super_admin" {
		return ErrSuperAdminRequired
	}

	if err := s.q.UpdatePlatformSetting(ctx, db.UpdatePlatformSettingParams{
		Key:       key,
		Value:     value,
		UpdatedBy: pgtype.UUID{Bytes: actorID, Valid: true},
	}); err != nil {
		return err
	}

	detailsJSON, _ := json.Marshal(map[string]interface{}{"key": key, "new_value": value})
	_ = s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    pgtype.UUID{Bytes: actorID, Valid: true},
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     "setting.update",
		TargetType: "platform_settings",
		TargetID:   pgtype.Text{String: key, Valid: true},
		Details:    detailsJSON,
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
		UserAgent:  pgtype.Text{String: ua, Valid: ua != ""},
	})

	return nil
}

