package community

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func getArticleParam(c *gin.Context) string {
	if s := c.Param("slug"); s != "" {
		return s
	}
	return c.Param("id")
}

// ToggleLike handles POST /api/v1/articles/:id/like
func (h *Handler) ToggleLike(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(getArticleParam(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	result, err := h.svc.ToggleLike(c.Request.Context(), userID, articleID)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "LIKE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"liked":       result.Liked,
		"likes_count": result.LikesCount,
	})
}

// ToggleBookmark handles POST /api/v1/articles/:id/bookmark
func (h *Handler) ToggleBookmark(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(getArticleParam(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	result, err := h.svc.ToggleBookmark(c.Request.Context(), userID, articleID)
	if err != nil {
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "BOOKMARK_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"bookmarked":      result.Bookmarked,
		"bookmarks_count": result.BookmarksCount,
	})
}

// GetInteractionStatus handles GET /api/v1/articles/:id/interaction
func (h *Handler) GetInteractionStatus(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(getArticleParam(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	authorID, err := uuid.Parse(c.Query("author_id"))
	if err != nil {
		authorID = uuid.Nil
	}

	status, err := h.svc.GetInteractionStatus(c.Request.Context(), userID, articleID, authorID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"interaction": status,
	})
}

// ToggleFollow handles POST /api/v1/authors/:username/follow
func (h *Handler) ToggleFollow(c *gin.Context) {
	followerID, ok := getContextUserID(c)
	if !ok {
		return
	}

	targetUsername := c.Param("username")
	result, err := h.svc.ToggleFollow(c.Request.Context(), followerID, targetUsername)
	if err != nil {
		if errors.Is(err, ErrCannotFollowSelf) {
			response.Error(c, http.StatusBadRequest, "CANNOT_FOLLOW_SELF", err.Error())
			return
		}
		if errors.Is(err, ErrAuthorNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Author not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FOLLOW_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"following":      result.Following,
		"follower_count": result.FollowerCount,
	})
}

// CreateComment handles POST /api/v1/articles/:id/comments
func (h *Handler) CreateComment(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	articleID, err := uuid.Parse(getArticleParam(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	var req CreateCommentInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	comment, err := h.svc.CreateComment(c.Request.Context(), authorID, articleID, req)
	if err != nil {
		if errors.Is(err, ErrInvalidCommentLength) {
			response.Error(c, http.StatusBadRequest, "INVALID_LENGTH", err.Error())
			return
		}
		if errors.Is(err, ErrArticleNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Article not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "COMMENT_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusCreated, gin.H{
		"message": "Comment posted successfully",
		"comment": comment,
	})
}

// ListComments handles GET /api/v1/articles/:id/comments (Public)
func (h *Handler) ListComments(c *gin.Context) {
	articleID, err := uuid.Parse(getArticleParam(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid article ID")
		return
	}

	threads, err := h.svc.ListComments(c.Request.Context(), articleID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"comments": threads,
		"count":    len(threads),
	})
}

// UpdateComment handles PUT /api/v1/comments/:id
func (h *Handler) UpdateComment(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	commentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	var req struct {
		Content string `json:"content" binding:"required,min=2,max=2000"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	comment, err := h.svc.UpdateComment(c.Request.Context(), authorID, commentID, req.Content)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Comment not found or unauthorized")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Comment updated successfully",
		"comment": comment,
	})
}

// DeleteComment handles DELETE /api/v1/comments/:id
func (h *Handler) DeleteComment(c *gin.Context) {
	authorID, ok := getContextUserID(c)
	if !ok {
		return
	}

	commentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	if err := h.svc.DeleteComment(c.Request.Context(), authorID, commentID); err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Comment not found or unauthorized")
			return
		}
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Comment deleted successfully",
	})
}

// ListBookmarks handles GET /api/v1/library/bookmarks
func (h *Handler) ListBookmarks(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	items, total, err := h.svc.ListBookmarks(c.Request.Context(), userID, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"bookmarks": items,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
		},
	})
}

// ListFollowingFeed handles GET /api/v1/feed/following
func (h *Handler) ListFollowingFeed(c *gin.Context) {
	followerID, ok := getContextUserID(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	articles, total, err := h.svc.ListFollowingFeed(c.Request.Context(), followerID, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))
	response.JSON(c, http.StatusOK, gin.H{
		"articles": articles,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"total_pages":   totalPages,
		},
	})
}

// ListNotifications handles GET /api/v1/notifications
func (h *Handler) ListNotifications(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	items, total, unreadCount, err := h.svc.ListNotifications(c.Request.Context(), userID, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"notifications": items,
		"meta": gin.H{
			"page":          page,
			"per_page":      perPage,
			"total_records": total,
			"unread_count":  unreadCount,
		},
	})
}

// MarkNotificationRead handles POST /api/v1/notifications/:id/read
func (h *Handler) MarkNotificationRead(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid notification ID")
		return
	}

	if err := h.svc.MarkNotificationAsRead(c.Request.Context(), userID, notificationID); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Notification marked as read",
	})
}

// MarkAllNotificationsRead handles POST /api/v1/notifications/read-all
func (h *Handler) MarkAllNotificationsRead(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	if err := h.svc.MarkAllNotificationsAsRead(c.Request.Context(), userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "All notifications marked as read",
	})
}

// GetUnreadCount handles GET /api/v1/notifications/unread-count
func (h *Handler) GetUnreadCount(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	count, err := h.svc.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"unread_count": count,
	})
}

type NewsletterRequest struct {
	Email  string `json:"email" binding:"required,email"`
	Source string `json:"source"`
}

// SubscribeNewsletter handles POST /api/v1/newsletter/subscribe
func (h *Handler) SubscribeNewsletter(c *gin.Context) {
	var req NewsletterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_EMAIL", "Please provide a valid email address")
		return
	}

	result, err := h.svc.SubscribeNewsletter(c.Request.Context(), req.Email, req.Source)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "SUBSCRIPTION_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, result)
}

// CreateSponsorship handles POST /api/v1/authors/:username/sponsorships
func (h *Handler) CreateSponsorship(c *gin.Context) {
	username := c.Param("username")
	var input CreateSponsorshipInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	var donorID *uuid.UUID
	if val, exists := c.Get(middleware.ContextUserID); exists {
		if uid, ok := val.(uuid.UUID); ok {
			donorID = &uid
		}
	}

	result, err := h.svc.CreateSponsorship(c.Request.Context(), username, donorID, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "SPONSORSHIP_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusCreated, result)
}

// ListAuthorSponsorships handles GET /api/v1/authors/:username/sponsorships
func (h *Handler) ListAuthorSponsorships(c *gin.Context) {
	username := c.Param("username")
	data, err := h.svc.ListAuthorSponsorships(c.Request.Context(), username)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, data)
}

// GetAuthorEarnings handles GET /api/v1/dashboard/monetization
func (h *Handler) GetAuthorEarnings(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	data, err := h.svc.GetAuthorEarnings(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, data)
}

// RecordHeartbeat handles POST /api/v1/articles/:slug/heartbeat
func (h *Handler) RecordHeartbeat(c *gin.Context) {
	slug := c.Param("slug")
	var req struct {
		VisitorHash string `json:"visitor_hash" binding:"required"`
		ScrollDepth int    `json:"scroll_depth"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", "Visitor hash required")
		return
	}

	_ = h.svc.RecordReadingHeartbeat(c.Request.Context(), slug, req.VisitorHash, req.ScrollDepth)
	response.JSON(c, http.StatusOK, gin.H{"recorded": true})
}

// GetLiveTelemetry handles GET /api/v1/articles/:slug/live-telemetry
func (h *Handler) GetLiveTelemetry(c *gin.Context) {
	slug := c.Param("slug")
	data, err := h.svc.GetLiveTelemetry(c.Request.Context(), slug)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, data)
}

// ListPeerReviews handles GET /api/v1/articles/:slug/peer-reviews
func (h *Handler) ListPeerReviews(c *gin.Context) {
	slug := c.Param("slug")
	reviews, err := h.svc.ListArticlePeerReviews(c.Request.Context(), slug)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusOK, gin.H{"reviews": reviews})
}

// SubmitPeerReview handles POST /api/v1/articles/:slug/peer-reviews
func (h *Handler) SubmitPeerReview(c *gin.Context) {
	userID, ok := getContextUserID(c)
	if !ok {
		return
	}

	slug := c.Param("slug")
	var input PeerReviewInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	review, err := h.svc.SubmitPeerReview(c.Request.Context(), userID, slug, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "SUBMIT_FAILED", err.Error())
		return
	}
	response.JSON(c, http.StatusCreated, review)
}

// UnsubscribeNewsletter handles POST /api/v1/newsletter/unsubscribe
func (h *Handler) UnsubscribeNewsletter(c *gin.Context) {
	var req NewsletterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_EMAIL", "Please provide a valid email address")
		return
	}

	result, err := h.svc.UnsubscribeNewsletter(c.Request.Context(), req.Email)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UNSUBSCRIBE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, result)
}

func getContextUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(middleware.ContextUserID)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return uuid.Nil, false
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		response.Error(c, http.StatusInternalServerError, "INVALID_CONTEXT", "Invalid user context")
		return uuid.Nil, false
	}
	return userID, true
}

