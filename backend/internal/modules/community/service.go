package community

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/microcosm-cc/bluemonday"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/quorix/quorix-backend/internal/modules/email"
)

var (
	ErrArticleNotFound      = errors.New("article not found")
	ErrCommentNotFound      = errors.New("comment not found or unauthorized")
	ErrAuthorNotFound       = errors.New("author not found")
	ErrCannotFollowSelf     = errors.New("authors cannot follow themselves")
	ErrInvalidCommentLength = errors.New("comment content must be between 2 and 2000 characters")
)

type LikeResult struct {
	Liked      bool  `json:"liked"`
	LikesCount int32 `json:"likes_count"`
}

type BookmarkResult struct {
	Bookmarked     bool  `json:"bookmarked"`
	BookmarksCount int32 `json:"bookmarks_count"`
}

type FollowResult struct {
	Following     bool  `json:"following"`
	FollowerCount int32 `json:"follower_count"`
}

type InteractionStatus struct {
	Liked          bool `json:"liked"`
	Bookmarked     bool `json:"bookmarked"`
	FollowingAuthor bool `json:"following_author"`
}

type CommentDetail struct {
	ID          string    `json:"id"`
	ArticleID   string    `json:"article_id"`
	AuthorID    string    `json:"author_id"`
	ParentID    *string   `json:"parent_id,omitempty"`
	Content     string    `json:"content"`
	IsEdited    bool      `json:"is_edited"`
	IsDeleted   bool      `json:"is_deleted"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
}

type CommentThread struct {
	CommentDetail
	Replies []CommentDetail `json:"replies"`
}

type BookmarkedArticle struct {
	content.ArticleSummary
	BookmarkedAt time.Time `json:"bookmarked_at"`
}

type InAppNotificationItem struct {
	ID             string    `json:"id"`
	RecipientID    string    `json:"recipient_id"`
	ActorID        string    `json:"actor_id"`
	Type           string    `json:"type"`
	ArticleID      *string   `json:"article_id,omitempty"`
	CommentID      *string   `json:"comment_id,omitempty"`
	Title          string    `json:"title"`
	Message        string    `json:"message"`
	ActionURL      string    `json:"action_url"`
	IsRead         bool      `json:"is_read"`
	CreatedAt      time.Time `json:"created_at"`
	ActorUsername  string    `json:"actor_username"`
	ActorDisplayName string  `json:"actor_display_name"`
	ActorAvatarURL *string   `json:"actor_avatar_url,omitempty"`
}

type CreateCommentInput struct {
	ParentID *string `json:"parent_id" binding:"omitempty,uuid"`
	Content  string  `json:"content" binding:"required,min=2,max=2000"`
}

type CreateSponsorshipInput struct {
	AmountCents int     `json:"amount_cents" binding:"required,min=100"`
	Currency    string  `json:"currency"`
	TierName    string  `json:"tier_name"`
	DonorName   string  `json:"donor_name"`
	DonorEmail  string  `json:"donor_email"`
	Message     string  `json:"message"`
	IsAnonymous bool    `json:"is_anonymous"`
	ArticleID   *string `json:"article_id"`
}

type SponsorshipResult struct {
	ID        string    `json:"id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type SponsorshipItem struct {
	ID          string    `json:"id"`
	DonorName   string    `json:"donor_name"`
	AmountCents int       `json:"amount_cents"`
	Currency    string    `json:"currency"`
	TierName    string    `json:"tier_name"`
	Message     string    `json:"message"`
	IsAnonymous bool      `json:"is_anonymous"`
	CreatedAt   time.Time `json:"created_at"`
}

type AuthorSponsorshipsData struct {
	TotalSponsors int               `json:"total_sponsors"`
	TotalRaised   int               `json:"total_raised_cents"`
	Sponsorships  []SponsorshipItem `json:"sponsorships"`
}

type AuthorEarningsData struct {
	BalanceCents       int               `json:"balance_cents"`
	TotalEarnedCents   int               `json:"total_earned_cents"`
	PendingPayoutCents int               `json:"pending_payout_cents"`
	TotalSponsors      int               `json:"total_sponsors"`
	RecentTransactions []SponsorshipItem `json:"recent_transactions"`
}

type LiveTelemetryData struct {
	ArticleSlug      string `json:"article_slug"`
	ActiveReadersNow int    `json:"active_readers_now"`
	AvgScrollDepth   int    `json:"avg_scroll_depth_percent"`
}

type PeerReviewInput struct {
	Status                 string `json:"status" binding:"required"`
	VerdictSummary         string `json:"verdict_summary" binding:"required,min=10"`
	CodeBenchmarksVerified bool   `json:"code_benchmarks_verified"`
}

type PeerReviewItem struct {
	ID                     string    `json:"id"`
	ReviewerName           string    `json:"reviewer_name"`
	ReviewerUsername       string    `json:"reviewer_username"`
	ReviewerAvatarURL      *string   `json:"reviewer_avatar_url"`
	Status                 string    `json:"status"`
	VerdictSummary         string    `json:"verdict_summary"`
	CodeBenchmarksVerified bool      `json:"code_benchmarks_verified"`
	CreatedAt              time.Time `json:"created_at"`
}

type Service interface {
	ToggleLike(ctx context.Context, userID uuid.UUID, articleID uuid.UUID) (*LikeResult, error)
	ToggleBookmark(ctx context.Context, userID uuid.UUID, articleID uuid.UUID) (*BookmarkResult, error)
	ToggleFollow(ctx context.Context, followerID uuid.UUID, targetUsername string) (*FollowResult, error)
	GetInteractionStatus(ctx context.Context, userID uuid.UUID, articleID uuid.UUID, authorID uuid.UUID) (*InteractionStatus, error)

	CreateComment(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID, input CreateCommentInput) (*CommentDetail, error)
	ListComments(ctx context.Context, articleID uuid.UUID) ([]CommentThread, error)
	UpdateComment(ctx context.Context, authorID uuid.UUID, commentID uuid.UUID, newContent string) (*CommentDetail, error)
	DeleteComment(ctx context.Context, authorID uuid.UUID, commentID uuid.UUID) error

	ListBookmarks(ctx context.Context, userID uuid.UUID, page, perPage int) ([]BookmarkedArticle, int64, error)
	ListFollowingFeed(ctx context.Context, followerID uuid.UUID, page, perPage int) ([]content.ArticleSummary, int64, error)

	ListNotifications(ctx context.Context, userID uuid.UUID, page, perPage int) ([]InAppNotificationItem, int64, int64, error)
	MarkNotificationAsRead(ctx context.Context, userID uuid.UUID, notificationID uuid.UUID) error
	MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)

	SubscribeNewsletter(ctx context.Context, email, source string) (*NewsletterResult, error)
	UnsubscribeNewsletter(ctx context.Context, email string) (*NewsletterResult, error)

	// Creator Economy & Micro-Tipping
	CreateSponsorship(ctx context.Context, authorUsername string, donorID *uuid.UUID, input CreateSponsorshipInput) (*SponsorshipResult, error)
	ListAuthorSponsorships(ctx context.Context, authorUsername string) (*AuthorSponsorshipsData, error)
	GetAuthorEarnings(ctx context.Context, authorID uuid.UUID) (*AuthorEarningsData, error)

	// Live Telemetry & Peer Reviews
	RecordReadingHeartbeat(ctx context.Context, articleSlug, visitorHash string, scrollDepth int) error
	GetLiveTelemetry(ctx context.Context, articleSlug string) (*LiveTelemetryData, error)
	ListArticlePeerReviews(ctx context.Context, articleSlug string) ([]PeerReviewItem, error)
	SubmitPeerReview(ctx context.Context, reviewerID uuid.UUID, articleSlug string, input PeerReviewInput) (*PeerReviewItem, error)
}

type service struct {
	db        *database.DB
	q         *db.Queries
	emailSvc  email.Service
	sanitizer *bluemonday.Policy
}

func NewService(dbConn *database.DB, q *db.Queries, emailSvc email.Service) Service {
	return &service{
		db:        dbConn,
		q:         q,
		emailSvc:  emailSvc,
		sanitizer: bluemonday.UGCPolicy(),
	}
}

// ==========================================
// ARTICLE LIKES
// ==========================================

func (s *service) ToggleLike(ctx context.Context, userID uuid.UUID, articleID uuid.UUID) (*LikeResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	uid := pgtype.UUID{Bytes: userID, Valid: true}
	aid := pgtype.UUID{Bytes: articleID, Valid: true}

	hasLiked, err := s.q.HasUserLikedArticle(ctx, db.HasUserLikedArticleParams{
		UserID:    uid,
		ArticleID: aid,
	})
	if err != nil {
		return nil, err
	}

	article, err := s.q.GetArticleByID(ctx, aid)
	if err != nil {
		return nil, ErrArticleNotFound
	}

	if hasLiked {
		// Unlike
		if err := s.q.DeleteLike(ctx, db.DeleteLikeParams{UserID: uid, ArticleID: aid}); err != nil {
			return nil, err
		}
		_ = s.q.IncrementArticleLikes(ctx, db.IncrementArticleLikesParams{ID: aid, LikesCount: -1})
		newCount := article.LikesCount - 1
		if newCount < 0 {
			newCount = 0
		}
		return &LikeResult{Liked: false, LikesCount: newCount}, nil
	}

	// Like
	_, err = s.q.CreateLike(ctx, db.CreateLikeParams{UserID: uid, ArticleID: aid})
	if err != nil {
		return nil, err
	}
	_ = s.q.IncrementArticleLikes(ctx, db.IncrementArticleLikesParams{ID: aid, LikesCount: 1})

	// Dispatch in-app notification if actor != author
	articleAuthorID := uuid.UUID(article.AuthorID.Bytes)
	if articleAuthorID != userID {
		actorProfile, _ := s.q.GetProfileByUserID(ctx, uid)
		_, _ = s.q.CreateInAppNotification(ctx, db.CreateInAppNotificationParams{
			RecipientID: article.AuthorID,
			ActorID:     uid,
			Type:        "like",
			ArticleID:   aid,
			CommentID:   pgtype.UUID{},
			Title:       "New Appreciation",
			Message:     fmt.Sprintf("%s liked your article \"%s\"", actorProfile.DisplayName, article.Title),
			ActionUrl:   fmt.Sprintf("/article/%s", article.Slug),
		})
	}

	return &LikeResult{Liked: true, LikesCount: article.LikesCount + 1}, nil
}

// ==========================================
// BOOKMARKS
// ==========================================

func (s *service) ToggleBookmark(ctx context.Context, userID uuid.UUID, articleID uuid.UUID) (*BookmarkResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	uid := pgtype.UUID{Bytes: userID, Valid: true}
	aid := pgtype.UUID{Bytes: articleID, Valid: true}

	hasBookmarked, err := s.q.HasUserBookmarkedArticle(ctx, db.HasUserBookmarkedArticleParams{
		UserID:    uid,
		ArticleID: aid,
	})
	if err != nil {
		return nil, err
	}

	article, err := s.q.GetArticleByID(ctx, aid)
	if err != nil {
		return nil, ErrArticleNotFound
	}

	if hasBookmarked {
		// Remove bookmark
		if err := s.q.DeleteBookmark(ctx, db.DeleteBookmarkParams{UserID: uid, ArticleID: aid}); err != nil {
			return nil, err
		}
		_ = s.q.IncrementArticleBookmarks(ctx, db.IncrementArticleBookmarksParams{ID: aid, BookmarksCount: -1})
		newCount := article.BookmarksCount - 1
		if newCount < 0 {
			newCount = 0
		}
		return &BookmarkResult{Bookmarked: false, BookmarksCount: newCount}, nil
	}

	// Add bookmark
	_, err = s.q.CreateBookmark(ctx, db.CreateBookmarkParams{UserID: uid, ArticleID: aid})
	if err != nil {
		return nil, err
	}
	_ = s.q.IncrementArticleBookmarks(ctx, db.IncrementArticleBookmarksParams{ID: aid, BookmarksCount: 1})

	return &BookmarkResult{Bookmarked: true, BookmarksCount: article.BookmarksCount + 1}, nil
}

func (s *service) ListBookmarks(ctx context.Context, userID uuid.UUID, page, perPage int) ([]BookmarkedArticle, int64, error) {
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

	uid := pgtype.UUID{Bytes: userID, Valid: true}
	rows, err := s.q.ListBookmarksByUserID(ctx, db.ListBookmarksByUserIDParams{
		UserID: uid,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, err
	}

	items := make([]BookmarkedArticle, 0, len(rows))
	for _, r := range rows {
		var subtitle, cover, avatar *string
		if r.Subtitle.Valid {
			subtitle = &r.Subtitle.String
		}
		if r.CoverImageUrl.Valid {
			cover = &r.CoverImageUrl.String
		}

		profile, _ := s.q.GetProfileByUserID(ctx, r.AuthorID)
		if profile.AvatarUrl.Valid {
			avatar = &profile.AvatarUrl.String
		}

		items = append(items, BookmarkedArticle{
			ArticleSummary: content.ArticleSummary{
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
				PublishedAt:        r.PublishedAt.Time,
				Author: content.AuthorRef{
					Username:    r.AuthorUsername,
					DisplayName: r.AuthorDisplayName,
					AvatarURL:   avatar,
				},
			},
			BookmarkedAt: r.BookmarkedAt.Time,
		})
	}

	return items, int64(len(items)), nil
}

// ==========================================
// COMMENTS & REPLIES
// ==========================================

func (s *service) CreateComment(ctx context.Context, authorID uuid.UUID, articleID uuid.UUID, input CreateCommentInput) (*CommentDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	cleanContent := strings.TrimSpace(input.Content)
	if len(cleanContent) < 2 || len(cleanContent) > 2000 {
		return nil, ErrInvalidCommentLength
	}
	cleanContent = s.sanitizer.Sanitize(cleanContent)

	aid := pgtype.UUID{Bytes: articleID, Valid: true}
	article, err := s.q.GetArticleByID(ctx, aid)
	if err != nil {
		return nil, ErrArticleNotFound
	}

	var parentUUID pgtype.UUID
	var parentComment *db.Comment
	if input.ParentID != nil && *input.ParentID != "" {
		pID, err := uuid.Parse(*input.ParentID)
		if err == nil {
			parentUUID = pgtype.UUID{Bytes: pID, Valid: true}
			pc, err := s.q.GetCommentByID(ctx, parentUUID)
			if err == nil {
				parentComment = &db.Comment{
					ID:        pc.ID,
					AuthorID:  pc.AuthorID,
					ArticleID: pc.ArticleID,
				}
			}
		}
	}

	uid := pgtype.UUID{Bytes: authorID, Valid: true}
	comment, err := s.q.CreateComment(ctx, db.CreateCommentParams{
		ArticleID: aid,
		AuthorID:  uid,
		ParentID:  parentUUID,
		Content:   cleanContent,
	})
	if err != nil {
		return nil, err
	}

	// Increment article comments count
	_ = s.q.IncrementArticleComments(ctx, db.IncrementArticleCommentsParams{
		ID:            aid,
		CommentsCount: 1,
	})

	commenterProfile, _ := s.q.GetProfileByUserID(ctx, uid)

	// Dispatch In-App & Email Notifications
	articleAuthorID := uuid.UUID(article.AuthorID.Bytes)
	commentID := comment.ID

	if parentComment != nil {
		// Reply notification to parent comment author
		parentAuthorID := uuid.UUID(parentComment.AuthorID.Bytes)
		if parentAuthorID != authorID {
			_, _ = s.q.CreateInAppNotification(ctx, db.CreateInAppNotificationParams{
				RecipientID: parentComment.AuthorID,
				ActorID:     uid,
				Type:        "reply",
				ArticleID:   aid,
				CommentID:   commentID,
				Title:       "New Reply to Your Comment",
				Message:     fmt.Sprintf("%s replied to your comment on \"%s\"", commenterProfile.DisplayName, article.Title),
				ActionUrl:   fmt.Sprintf("/article/%s#comments", article.Slug),
			})

			// Dispatch transactional email if recipient has email preference enabled
			if s.emailSvc != nil {
				parentUser, _ := s.q.GetUserByID(ctx, parentComment.AuthorID)
				parentProfile, _ := s.q.GetProfileByUserID(ctx, parentComment.AuthorID)
				_, _ = s.emailSvc.EnqueueWithPreferenceCheck(
					ctx,
					parentAuthorID,
					parentUser.Email,
					parentProfile.DisplayName,
					email.TemplateNewComment,
					map[string]any{
						"RecipientName":  parentProfile.DisplayName,
						"CommenterName":  commenterProfile.DisplayName,
						"ArticleTitle":   article.Title,
						"ArticleURL":     fmt.Sprintf("/article/%s#comments", article.Slug),
						"CommentSnippet": cleanContent,
					},
				)
			}
		}
	} else if articleAuthorID != authorID {
		// Top-level comment notification to article author
		_, _ = s.q.CreateInAppNotification(ctx, db.CreateInAppNotificationParams{
			RecipientID: article.AuthorID,
			ActorID:     uid,
			Type:        "comment",
			ArticleID:   aid,
			CommentID:   commentID,
			Title:       "New Comment on Your Article",
			Message:     fmt.Sprintf("%s commented on \"%s\"", commenterProfile.DisplayName, article.Title),
			ActionUrl:   fmt.Sprintf("/article/%s#comments", article.Slug),
		})

		if s.emailSvc != nil {
			articleAuthorUser, _ := s.q.GetUserByID(ctx, article.AuthorID)
			articleAuthorProfile, _ := s.q.GetProfileByUserID(ctx, article.AuthorID)
			_, _ = s.emailSvc.EnqueueWithPreferenceCheck(
				ctx,
				articleAuthorID,
				articleAuthorUser.Email,
				articleAuthorProfile.DisplayName,
				email.TemplateNewComment,
				map[string]any{
					"RecipientName":  articleAuthorProfile.DisplayName,
					"CommenterName":  commenterProfile.DisplayName,
					"ArticleTitle":   article.Title,
					"ArticleURL":     fmt.Sprintf("/article/%s#comments", article.Slug),
					"CommentSnippet": cleanContent,
				},
			)
		}
	}

	var avatar *string
	if commenterProfile.AvatarUrl.Valid {
		avatar = &commenterProfile.AvatarUrl.String
	}

	var pIDStr *string
	if comment.ParentID.Valid {
		s := uuid.UUID(comment.ParentID.Bytes).String()
		pIDStr = &s
	}

	return &CommentDetail{
		ID:          uuid.UUID(comment.ID.Bytes).String(),
		ArticleID:   uuid.UUID(comment.ArticleID.Bytes).String(),
		AuthorID:    authorID.String(),
		ParentID:    pIDStr,
		Content:     comment.Content,
		IsEdited:    comment.IsEdited,
		IsDeleted:   comment.IsDeleted,
		CreatedAt:   comment.CreatedAt.Time,
		UpdatedAt:   comment.UpdatedAt.Time,
		Username:    commenterProfile.Username,
		DisplayName: commenterProfile.DisplayName,
		AvatarURL:   avatar,
	}, nil
}

func (s *service) ListComments(ctx context.Context, articleID uuid.UUID) ([]CommentThread, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	aid := pgtype.UUID{Bytes: articleID, Valid: true}
	rows, err := s.q.ListCommentsByArticleID(ctx, aid)
	if err != nil {
		return nil, err
	}

	threadsMap := make(map[string]*CommentThread)
	var topLevelOrder []string

	for _, r := range rows {
		var avatar *string
		if r.AvatarUrl.Valid {
			avatar = &r.AvatarUrl.String
		}

		cID := uuid.UUID(r.ID.Bytes).String()
		var pIDStr *string
		if r.ParentID.Valid {
			s := uuid.UUID(r.ParentID.Bytes).String()
			pIDStr = &s
		}

		item := CommentDetail{
			ID:          cID,
			ArticleID:   uuid.UUID(r.ArticleID.Bytes).String(),
			AuthorID:    uuid.UUID(r.AuthorID.Bytes).String(),
			ParentID:    pIDStr,
			Content:     r.Content,
			IsEdited:    r.IsEdited,
			IsDeleted:   r.IsDeleted,
			CreatedAt:   r.CreatedAt.Time,
			UpdatedAt:   r.UpdatedAt.Time,
			Username:    r.Username,
			DisplayName: r.DisplayName,
			AvatarURL:   avatar,
		}

		if pIDStr == nil {
			threadsMap[cID] = &CommentThread{
				CommentDetail: item,
				Replies:       []CommentDetail{},
			}
			topLevelOrder = append(topLevelOrder, cID)
		} else {
			// Nested reply
			if parent, exists := threadsMap[*pIDStr]; exists {
				parent.Replies = append(parent.Replies, item)
			}
		}
	}

	result := make([]CommentThread, 0, len(topLevelOrder))
	for _, id := range topLevelOrder {
		result = append(result, *threadsMap[id])
	}

	return result, nil
}

func (s *service) UpdateComment(ctx context.Context, authorID uuid.UUID, commentID uuid.UUID, newContent string) (*CommentDetail, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	cleanContent := strings.TrimSpace(newContent)
	if len(cleanContent) < 2 || len(cleanContent) > 2000 {
		return nil, ErrInvalidCommentLength
	}
	cleanContent = s.sanitizer.Sanitize(cleanContent)

	cid := pgtype.UUID{Bytes: commentID, Valid: true}
	uid := pgtype.UUID{Bytes: authorID, Valid: true}

	updated, err := s.q.UpdateCommentContent(ctx, db.UpdateCommentContentParams{
		ID:       cid,
		Content:  cleanContent,
		AuthorID: uid,
	})
	if err != nil {
		return nil, ErrCommentNotFound
	}

	profile, _ := s.q.GetProfileByUserID(ctx, uid)
	var avatar *string
	if profile.AvatarUrl.Valid {
		avatar = &profile.AvatarUrl.String
	}

	var pIDStr *string
	if updated.ParentID.Valid {
		s := uuid.UUID(updated.ParentID.Bytes).String()
		pIDStr = &s
	}

	return &CommentDetail{
		ID:          uuid.UUID(updated.ID.Bytes).String(),
		ArticleID:   uuid.UUID(updated.ArticleID.Bytes).String(),
		AuthorID:    authorID.String(),
		ParentID:    pIDStr,
		Content:     updated.Content,
		IsEdited:    updated.IsEdited,
		IsDeleted:   updated.IsDeleted,
		CreatedAt:   updated.CreatedAt.Time,
		UpdatedAt:   updated.UpdatedAt.Time,
		Username:    profile.Username,
		DisplayName: profile.DisplayName,
		AvatarURL:   avatar,
	}, nil
}

func (s *service) DeleteComment(ctx context.Context, authorID uuid.UUID, commentID uuid.UUID) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	cid := pgtype.UUID{Bytes: commentID, Valid: true}
	uid := pgtype.UUID{Bytes: authorID, Valid: true}

	deleted, err := s.q.DeleteComment(ctx, db.DeleteCommentParams{
		ID:       cid,
		AuthorID: uid,
	})
	if err != nil {
		return ErrCommentNotFound
	}

	_ = s.q.IncrementArticleComments(ctx, db.IncrementArticleCommentsParams{
		ID:            deleted.ArticleID,
		CommentsCount: -1,
	})

	return nil
}

// ==========================================
// FOLLOWS & FOLLOWING FEED
// ==========================================

func (s *service) ToggleFollow(ctx context.Context, followerID uuid.UUID, targetUsername string) (*FollowResult, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	targetProfile, err := s.q.GetProfileByUsername(ctx, targetUsername)
	if err != nil {
		return nil, ErrAuthorNotFound
	}

	targetUserID := uuid.UUID(targetProfile.UserID.Bytes)
	if followerID == targetUserID {
		return nil, ErrCannotFollowSelf
	}

	followerUID := pgtype.UUID{Bytes: followerID, Valid: true}
	targetUID := pgtype.UUID{Bytes: targetUserID, Valid: true}

	isFollowing, err := s.q.IsFollowing(ctx, db.IsFollowingParams{
		FollowerID:  followerUID,
		FollowingID: targetUID,
	})
	if err != nil {
		return nil, err
	}

	if isFollowing {
		// Unfollow
		if err := s.q.DeleteFollow(ctx, db.DeleteFollowParams{FollowerID: followerUID, FollowingID: targetUID}); err != nil {
			return nil, err
		}
		_ = s.q.UpdateFollowingCounts(ctx, db.UpdateFollowingCountsParams{UserID: followerUID, FollowingCount: -1})
		_ = s.q.UpdateFollowerCounts(ctx, db.UpdateFollowerCountsParams{UserID: targetUID, FollowerCount: -1})

		newCount := targetProfile.FollowerCount - 1
		if newCount < 0 {
			newCount = 0
		}
		return &FollowResult{Following: false, FollowerCount: newCount}, nil
	}

	// Follow
	_, err = s.q.CreateFollow(ctx, db.CreateFollowParams{FollowerID: followerUID, FollowingID: targetUID})
	if err != nil {
		return nil, err
	}
	_ = s.q.UpdateFollowingCounts(ctx, db.UpdateFollowingCountsParams{UserID: followerUID, FollowingCount: 1})
	_ = s.q.UpdateFollowerCounts(ctx, db.UpdateFollowerCountsParams{UserID: targetUID, FollowerCount: 1})

	// Dispatch In-App & Email Notifications
	followerProfile, _ := s.q.GetProfileByUserID(ctx, followerUID)
	_, _ = s.q.CreateInAppNotification(ctx, db.CreateInAppNotificationParams{
		RecipientID: targetUID,
		ActorID:     followerUID,
		Type:        "follow",
		ArticleID:   pgtype.UUID{},
		CommentID:   pgtype.UUID{},
		Title:       "New Follower",
		Message:     fmt.Sprintf("%s (@%s) started following you", followerProfile.DisplayName, followerProfile.Username),
		ActionUrl:   fmt.Sprintf("/author/%s", followerProfile.Username),
	})

	if s.emailSvc != nil {
		targetUser, _ := s.q.GetUserByID(ctx, targetUID)
		_, _ = s.emailSvc.EnqueueWithPreferenceCheck(
			ctx,
			targetUserID,
			targetUser.Email,
			targetProfile.DisplayName,
			email.TemplateNewFollower,
			map[string]any{
				"RecipientName":  targetProfile.DisplayName,
				"FollowerName":   followerProfile.DisplayName,
				"FollowerHandle": followerProfile.Username,
				"FollowerURL":    fmt.Sprintf("/author/%s", followerProfile.Username),
			},
		)
	}

	return &FollowResult{Following: true, FollowerCount: targetProfile.FollowerCount + 1}, nil
}

func (s *service) ListFollowingFeed(ctx context.Context, followerID uuid.UUID, page, perPage int) ([]content.ArticleSummary, int64, error) {
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

	uid := pgtype.UUID{Bytes: followerID, Valid: true}
	rows, err := s.q.ListFollowingFeed(ctx, db.ListFollowingFeedParams{
		FollowerID: uid,
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		return nil, 0, err
	}

	total, _ := s.q.CountFollowingFeed(ctx, uid)

	items := make([]content.ArticleSummary, 0, len(rows))
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

		var catRef *content.CategoryRef
		if r.CategoryName.Valid && r.CategorySlug.Valid {
			catRef = &content.CategoryRef{
				Name: r.CategoryName.String,
				Slug: r.CategorySlug.String,
			}
		}

		items = append(items, content.ArticleSummary{
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
			PublishedAt:        r.PublishedAt.Time,
			Author: content.AuthorRef{
				Username:    r.AuthorUsername,
				DisplayName: r.AuthorDisplayName,
				AvatarURL:   avatar,
			},
			Category: catRef,
		})
	}

	return items, total, nil
}

func (s *service) GetInteractionStatus(ctx context.Context, userID uuid.UUID, articleID uuid.UUID, authorID uuid.UUID) (*InteractionStatus, error) {
	if s.q == nil {
		return nil, errors.New("database not available")
	}

	uid := pgtype.UUID{Bytes: userID, Valid: true}
	aid := pgtype.UUID{Bytes: articleID, Valid: true}
	authorUID := pgtype.UUID{Bytes: authorID, Valid: true}

	liked, _ := s.q.HasUserLikedArticle(ctx, db.HasUserLikedArticleParams{UserID: uid, ArticleID: aid})
	bookmarked, _ := s.q.HasUserBookmarkedArticle(ctx, db.HasUserBookmarkedArticleParams{UserID: uid, ArticleID: aid})
	following, _ := s.q.IsFollowing(ctx, db.IsFollowingParams{FollowerID: uid, FollowingID: authorUID})

	return &InteractionStatus{
		Liked:           liked,
		Bookmarked:      bookmarked,
		FollowingAuthor: following,
	}, nil
}

// ==========================================
// NOTIFICATION CENTER
// ==========================================

func (s *service) ListNotifications(ctx context.Context, userID uuid.UUID, page, perPage int) ([]InAppNotificationItem, int64, int64, error) {
	if s.q == nil {
		return nil, 0, 0, errors.New("database not available")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}
	offset := int32((page - 1) * perPage)
	limit := int32(perPage)

	uid := pgtype.UUID{Bytes: userID, Valid: true}
	rows, err := s.q.ListInAppNotifications(ctx, db.ListInAppNotificationsParams{
		RecipientID: uid,
		Limit:       limit,
		Offset:      offset,
	})
	if err != nil {
		return nil, 0, 0, err
	}

	unreadCount, _ := s.q.CountUnreadNotifications(ctx, uid)

	items := make([]InAppNotificationItem, 0, len(rows))
	for _, r := range rows {
		var avatar *string
		if r.ActorAvatarUrl.Valid {
			avatar = &r.ActorAvatarUrl.String
		}

		var artID, commID *string
		if r.ArticleID.Valid {
			s := uuid.UUID(r.ArticleID.Bytes).String()
			artID = &s
		}
		if r.CommentID.Valid {
			s := uuid.UUID(r.CommentID.Bytes).String()
			commID = &s
		}

		items = append(items, InAppNotificationItem{
			ID:               uuid.UUID(r.ID.Bytes).String(),
			RecipientID:      uuid.UUID(r.RecipientID.Bytes).String(),
			ActorID:          uuid.UUID(r.ActorID.Bytes).String(),
			Type:             r.Type,
			ArticleID:        artID,
			CommentID:        commID,
			Title:            r.Title,
			Message:          r.Message,
			ActionURL:        r.ActionUrl,
			IsRead:           r.IsRead,
			CreatedAt:        r.CreatedAt.Time,
			ActorUsername:    r.ActorUsername,
			ActorDisplayName: r.ActorDisplayName,
			ActorAvatarURL:   avatar,
		})
	}

	return items, int64(len(items)), unreadCount, nil
}

func (s *service) MarkNotificationAsRead(ctx context.Context, userID uuid.UUID, notificationID uuid.UUID) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	return s.q.MarkNotificationAsRead(ctx, db.MarkNotificationAsReadParams{
		ID:          pgtype.UUID{Bytes: notificationID, Valid: true},
		RecipientID: pgtype.UUID{Bytes: userID, Valid: true},
	})
}

func (s *service) MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) error {
	if s.q == nil {
		return errors.New("database not available")
	}

	return s.q.MarkAllNotificationsAsRead(ctx, pgtype.UUID{Bytes: userID, Valid: true})
}

func (s *service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	if s.q == nil {
		return 0, errors.New("database not available")
	}

	return s.q.CountUnreadNotifications(ctx, pgtype.UUID{Bytes: userID, Valid: true})
}

// ==========================================
// NEWSLETTER SUBSCRIPTION
// ==========================================

type NewsletterResult struct {
	Message    string `json:"message"`
	Subscribed bool   `json:"subscribed"`
}

func (s *service) SubscribeNewsletter(ctx context.Context, emailAddr, source string) (*NewsletterResult, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(emailAddr))
	if _, err := mail.ParseAddress(cleanEmail); err != nil {
		return nil, errors.New("invalid email address format")
	}

	if source == "" {
		source = "global_footer"
	}

	var status string
	err := s.db.Pool.QueryRow(ctx, `SELECT status FROM newsletter_subscriptions WHERE lower(email) = lower($1)`, cleanEmail).Scan(&status)
	if err == nil {
		if status == "active" {
			return &NewsletterResult{
				Message:    "You are already subscribed to the QUORIX architectural digest.",
				Subscribed: true,
			}, nil
		}
		// Reactivate
		_, err = s.db.Pool.Exec(ctx, `UPDATE newsletter_subscriptions SET status = 'active', updated_at = NOW() WHERE lower(email) = lower($1)`, cleanEmail)
		if err != nil {
			return nil, err
		}
		return &NewsletterResult{
			Message:    "Welcome back! Your newsletter subscription has been reactivated.",
			Subscribed: true,
		}, nil
	}

	// Insert fresh subscription
	_, err = s.db.Pool.Exec(ctx, `
		INSERT INTO newsletter_subscriptions (email, status, source)
		VALUES ($1, 'active', $2)
	`, cleanEmail, source)
	if err != nil {
		return nil, err
	}

	return &NewsletterResult{
		Message:    "Successfully subscribed! Check your inbox for the weekly architecture digest.",
		Subscribed: true,
	}, nil
}

func (s *service) UnsubscribeNewsletter(ctx context.Context, emailAddr string) (*NewsletterResult, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(emailAddr))
	if _, err := mail.ParseAddress(cleanEmail); err != nil {
		return nil, errors.New("invalid email address format")
	}

	res, err := s.db.Pool.Exec(ctx, `
		UPDATE newsletter_subscriptions
		SET status = 'unsubscribed', updated_at = NOW()
		WHERE lower(email) = lower($1)
	`, cleanEmail)
	if err != nil {
		return nil, err
	}

	if res.RowsAffected() == 0 {
		return nil, errors.New("email address was not found in active subscribers")
	}

	return &NewsletterResult{
		Message:    "You have been successfully unsubscribed from the newsletter.",
		Subscribed: false,
	}, nil
}

// ==========================================
// CREATOR MONETIZATION & SPONSORSHIPS
// ==========================================

func (s *service) CreateSponsorship(ctx context.Context, authorUsername string, donorID *uuid.UUID, input CreateSponsorshipInput) (*SponsorshipResult, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	var authorID uuid.UUID
	err := s.db.Pool.QueryRow(ctx, `SELECT user_id FROM profiles WHERE LOWER(username) = LOWER($1)`, authorUsername).Scan(&authorID)
	if err != nil {
		return nil, ErrAuthorNotFound
	}

	tier := strings.TrimSpace(input.TierName)
	if tier == "" {
		tier = "Coffee & Server Support"
	}
	donorName := strings.TrimSpace(input.DonorName)
	if donorName == "" {
		donorName = "Anonymous Engineer"
	}
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = "USD"
	}

	var articleID *uuid.UUID
	if input.ArticleID != nil && *input.ArticleID != "" {
		if aid, err := uuid.Parse(*input.ArticleID); err == nil {
			articleID = &aid
		}
	}

	var spID uuid.UUID
	var createdAt time.Time
	err = s.db.Pool.QueryRow(ctx, `
		INSERT INTO author_sponsorships (
			author_id, donor_id, article_id, amount_cents, currency, tier_name,
			donor_name, donor_email, message, is_anonymous, payment_status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', NOW())
		RETURNING id, created_at
	`, authorID, donorID, articleID, input.AmountCents, currency, tier, donorName, input.DonorEmail, input.Message, input.IsAnonymous).Scan(&spID, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to record sponsorship: %w", err)
	}

	return &SponsorshipResult{
		ID:        spID.String(),
		Message:   fmt.Sprintf("Successfully sponsored @%s with $%0.2f!", authorUsername, float64(input.AmountCents)/100.0),
		CreatedAt: createdAt,
	}, nil
}

func (s *service) ListAuthorSponsorships(ctx context.Context, authorUsername string) (*AuthorSponsorshipsData, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	rows, err := s.db.Pool.Query(ctx, `
		SELECT s.id, s.donor_name, s.amount_cents, s.currency, s.tier_name, COALESCE(s.message, ''), s.is_anonymous, s.created_at
		FROM author_sponsorships s
		JOIN profiles p ON s.author_id = p.user_id
		WHERE LOWER(p.username) = LOWER($1) AND s.payment_status = 'completed'
		ORDER BY s.created_at DESC
		LIMIT 25
	`, authorUsername)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []SponsorshipItem
	totalRaised := 0
	for rows.Next() {
		var it SponsorshipItem
		var id uuid.UUID
		if err := rows.Scan(&id, &it.DonorName, &it.AmountCents, &it.Currency, &it.TierName, &it.Message, &it.IsAnonymous, &it.CreatedAt); err != nil {
			continue
		}
		it.ID = id.String()
		if it.IsAnonymous {
			it.DonorName = "Anonymous Sponsor"
		}
		totalRaised += it.AmountCents
		items = append(items, it)
	}

	return &AuthorSponsorshipsData{
		TotalSponsors: len(items),
		TotalRaised:   totalRaised,
		Sponsorships:  items,
	}, nil
}

func (s *service) GetAuthorEarnings(ctx context.Context, authorID uuid.UUID) (*AuthorEarningsData, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	var totalEarned int
	var totalSponsors int
	_ = s.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0), COUNT(id)
		FROM author_sponsorships
		WHERE author_id = $1 AND payment_status = 'completed'
	`, authorID).Scan(&totalEarned, &totalSponsors)

	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, donor_name, amount_cents, currency, tier_name, COALESCE(message, ''), is_anonymous, created_at
		FROM author_sponsorships
		WHERE author_id = $1 AND payment_status = 'completed'
		ORDER BY created_at DESC
		LIMIT 20
	`, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []SponsorshipItem
	for rows.Next() {
		var it SponsorshipItem
		var id uuid.UUID
		if err := rows.Scan(&id, &it.DonorName, &it.AmountCents, &it.Currency, &it.TierName, &it.Message, &it.IsAnonymous, &it.CreatedAt); err != nil {
			continue
		}
		it.ID = id.String()
		transactions = append(transactions, it)
	}

	return &AuthorEarningsData{
		BalanceCents:       totalEarned,
		TotalEarnedCents:   totalEarned,
		PendingPayoutCents: 0,
		TotalSponsors:      totalSponsors,
		RecentTransactions: transactions,
	}, nil
}

// ==========================================
// LIVE TELEMETRY & PEER REVIEWS
// ==========================================

func (s *service) RecordReadingHeartbeat(ctx context.Context, articleSlug, visitorHash string, scrollDepth int) error {
	if s.db == nil || s.db.Pool == nil {
		return errors.New("database not available")
	}

	_, err := s.db.Pool.Exec(ctx, `
		INSERT INTO live_reading_heartbeats (article_id, visitor_hash, scroll_depth_percent, last_ping)
		VALUES (
			(SELECT id FROM articles WHERE slug = $1),
			$2,
			$3,
			NOW()
		)
		ON CONFLICT (article_id, visitor_hash)
		DO UPDATE SET scroll_depth_percent = EXCLUDED.scroll_depth_percent, last_ping = NOW()
	`, articleSlug, visitorHash, scrollDepth)
	return err
}

func (s *service) GetLiveTelemetry(ctx context.Context, articleSlug string) (*LiveTelemetryData, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	var activeReaders int
	var avgScroll int
	err := s.db.Pool.QueryRow(ctx, `
		SELECT 
			COUNT(*)::int,
			COALESCE(AVG(scroll_depth_percent), 0)::int
		FROM live_reading_heartbeats
		WHERE article_id = (SELECT id FROM articles WHERE slug = $1)
		  AND last_ping >= NOW() - INTERVAL '60 seconds'
	`, articleSlug).Scan(&activeReaders, &avgScroll)
	if err != nil {
		return nil, err
	}

	if activeReaders == 0 {
		activeReaders = 1
	}

	return &LiveTelemetryData{
		ArticleSlug:      articleSlug,
		ActiveReadersNow: activeReaders,
		AvgScrollDepth:   avgScroll,
	}, nil
}

func (s *service) ListArticlePeerReviews(ctx context.Context, articleSlug string) ([]PeerReviewItem, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	rows, err := s.db.Pool.Query(ctx, `
		SELECT pr.id, pr.status, pr.verdict_summary, pr.code_benchmarks_verified, pr.created_at,
		       p.username, p.display_name, p.avatar_url
		FROM article_peer_reviews pr
		JOIN profiles p ON pr.reviewer_id = p.user_id
		WHERE pr.article_id = (SELECT id FROM articles WHERE slug = $1)
		ORDER BY pr.created_at DESC
	`, articleSlug)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []PeerReviewItem
	for rows.Next() {
		var r PeerReviewItem
		var id uuid.UUID
		var avatar *string
		if err := rows.Scan(&id, &r.Status, &r.VerdictSummary, &r.CodeBenchmarksVerified, &r.CreatedAt, &r.ReviewerUsername, &r.ReviewerName, &avatar); err != nil {
			continue
		}
		r.ID = id.String()
		r.ReviewerAvatarURL = avatar
		reviews = append(reviews, r)
	}
	return reviews, nil
}

func (s *service) SubmitPeerReview(ctx context.Context, reviewerID uuid.UUID, articleSlug string, input PeerReviewInput) (*PeerReviewItem, error) {
	if s.db == nil || s.db.Pool == nil {
		return nil, errors.New("database not available")
	}

	var articleID uuid.UUID
	err := s.db.Pool.QueryRow(ctx, `SELECT id FROM articles WHERE slug = $1`, articleSlug).Scan(&articleID)
	if err != nil {
		return nil, ErrArticleNotFound
	}

	var reviewID uuid.UUID
	var createdAt time.Time
	err = s.db.Pool.QueryRow(ctx, `
		INSERT INTO article_peer_reviews (article_id, reviewer_id, status, verdict_summary, code_benchmarks_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (article_id, reviewer_id)
		DO UPDATE SET status = EXCLUDED.status, verdict_summary = EXCLUDED.verdict_summary, code_benchmarks_verified = EXCLUDED.code_benchmarks_verified, updated_at = NOW()
		RETURNING id, created_at
	`, articleID, reviewerID, input.Status, input.VerdictSummary, input.CodeBenchmarksVerified).Scan(&reviewID, &createdAt)
	if err != nil {
		return nil, err
	}

	var username, displayName string
	var avatar *string
	_ = s.db.Pool.QueryRow(ctx, `SELECT username, display_name, avatar_url FROM profiles WHERE user_id = $1`, reviewerID).Scan(&username, &displayName, &avatar)

	return &PeerReviewItem{
		ID:                     reviewID.String(),
		ReviewerName:           displayName,
		ReviewerUsername:       username,
		ReviewerAvatarURL:      avatar,
		Status:                 input.Status,
		VerdictSummary:         input.VerdictSummary,
		CodeBenchmarksVerified: input.CodeBenchmarksVerified,
		CreatedAt:              createdAt,
	}, nil
}

