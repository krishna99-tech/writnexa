package community

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/modules/content"
	"github.com/quorix/quorix-backend/internal/modules/email"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupCommunityTest(t *testing.T) (*database.DB, Service, content.Service) {
	cfg, err := config.Load()
	require.NoError(t, err)

	pool, err := database.Connect(context.Background(), cfg.Database)
	require.NoError(t, err)

	queries := db.New(pool.Pool)
	emailSvc := email.NewService(cfg, pool, queries)
	commSvc := NewService(pool, queries, emailSvc)
	contentSvc := content.NewService(pool, queries)

	return pool, commSvc, contentSvc
}

func TestCommunity_LikesAndBookmarks(t *testing.T) {
	pool, commSvc, contentSvc := setupCommunityTest(t)
	defer pool.Close()

	ctx := context.Background()

	// 1. Get user Alex Morgan and Elena Rostova
	userAlex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(userAlex.UserID)

	userElena, err := contentSvc.GetAuthorProfile(ctx, "elenarostova")
	require.NoError(t, err)
	elenaID := uuid.MustParse(userElena.UserID)

	// Fetch Elena's article
	elenaArticles, _, err := contentSvc.ListAuthorArticles(ctx, "elenarostova", 1, 1)
	require.NoError(t, err)
	require.NotEmpty(t, elenaArticles)
	article := elenaArticles[0]
	articleID := uuid.MustParse(article.ID)

	// --- LIKES ---
	// 2. Alex likes Elena's article
	likeRes, err := commSvc.ToggleLike(ctx, alexID, articleID)
	require.NoError(t, err)
	assert.True(t, likeRes.Liked)
	assert.GreaterOrEqual(t, likeRes.LikesCount, int32(1))

	// Verify interaction status
	status, err := commSvc.GetInteractionStatus(ctx, alexID, articleID, elenaID)
	require.NoError(t, err)
	assert.True(t, status.Liked)

	// 3. Alex unlikes article (toggle)
	unlikeRes, err := commSvc.ToggleLike(ctx, alexID, articleID)
	require.NoError(t, err)
	assert.False(t, unlikeRes.Liked)

	// --- BOOKMARKS ---
	// 4. Alex bookmarks Elena's article
	bmRes, err := commSvc.ToggleBookmark(ctx, alexID, articleID)
	require.NoError(t, err)
	assert.True(t, bmRes.Bookmarked)

	// Check bookmarks list
	bms, total, err := commSvc.ListBookmarks(ctx, alexID, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, bms)

	// 5. Unbookmark
	unbmRes, err := commSvc.ToggleBookmark(ctx, alexID, articleID)
	require.NoError(t, err)
	assert.False(t, unbmRes.Bookmarked)
}

func TestCommunity_FollowsAndFeed(t *testing.T) {
	pool, commSvc, contentSvc := setupCommunityTest(t)
	defer pool.Close()

	ctx := context.Background()

	userAlex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(userAlex.UserID)

	// 1. Cannot follow oneself
	_, err = commSvc.ToggleFollow(ctx, alexID, "alexmorgan")
	assert.ErrorIs(t, err, ErrCannotFollowSelf)

	// 2. Follow Elena Rostova
	followRes, err := commSvc.ToggleFollow(ctx, alexID, "elenarostova")
	require.NoError(t, err)
	assert.True(t, followRes.Following)

	// 3. Check following feed
	feedArticles, total, err := commSvc.ListFollowingFeed(ctx, alexID, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(1))
	assert.NotEmpty(t, feedArticles)

	// 4. Unfollow Elena Rostova (clean up)
	unfollowRes, err := commSvc.ToggleFollow(ctx, alexID, "elenarostova")
	require.NoError(t, err)
	assert.False(t, unfollowRes.Following)
}

func TestCommunity_CommentsAndRepliesThread(t *testing.T) {
	pool, commSvc, contentSvc := setupCommunityTest(t)
	defer pool.Close()

	ctx := context.Background()

	userAlex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(userAlex.UserID)

	userMarcus, err := contentSvc.GetAuthorProfile(ctx, "marcusvance")
	require.NoError(t, err)
	marcusID := uuid.MustParse(userMarcus.UserID)

	// Get an article
	articles, _, err := contentSvc.ListPublishedArticles(ctx, 1, 1, "latest", "", "")
	require.NoError(t, err)
	require.NotEmpty(t, articles)
	articleID := uuid.MustParse(articles[0].ID)

	// 1. Post top-level comment by Alex
	commentText := "Exceptional architectural breakdown. How does this compare with Raft leader lease timeouts?"
	comment, err := commSvc.CreateComment(ctx, alexID, articleID, CreateCommentInput{
		Content: commentText,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, comment.ID)
	assert.Equal(t, commentText, comment.Content)
	assert.Nil(t, comment.ParentID)

	topCommentID := uuid.MustParse(comment.ID)

	// 2. Post reply by Marcus to Alex's comment
	replyText := "Leader leases typically require bounded clock drift to guarantee safety under network partitions."
	parentIDStr := comment.ID
	reply, err := commSvc.CreateComment(ctx, marcusID, articleID, CreateCommentInput{
		ParentID: &parentIDStr,
		Content:  replyText,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, reply.ID)
	assert.Equal(t, &parentIDStr, reply.ParentID)

	// 3. List comments and verify nested thread structure
	threads, err := commSvc.ListComments(ctx, articleID)
	require.NoError(t, err)
	assert.NotEmpty(t, threads)

	var foundThread *CommentThread
	for _, t := range threads {
		if t.ID == comment.ID {
			foundThread = &t
			break
		}
	}
	require.NotNil(t, foundThread)
	assert.NotEmpty(t, foundThread.Replies)
	assert.Equal(t, reply.ID, foundThread.Replies[0].ID)

	// 4. Update comment by author
	updatedContent := "Updated comment text with additional context."
	updated, err := commSvc.UpdateComment(ctx, alexID, topCommentID, updatedContent)
	require.NoError(t, err)
	assert.Equal(t, updatedContent, updated.Content)
	assert.True(t, updated.IsEdited)

	// 5. Delete comment (soft delete preserving replies thread)
	err = commSvc.DeleteComment(ctx, alexID, topCommentID)
	require.NoError(t, err)

	// Verify reply author cleanup
	replyID := uuid.MustParse(reply.ID)
	_ = commSvc.DeleteComment(ctx, marcusID, replyID)
}

func TestCommunity_NotificationCenter(t *testing.T) {
	pool, commSvc, contentSvc := setupCommunityTest(t)
	defer pool.Close()

	ctx := context.Background()

	userAlex, err := contentSvc.GetAuthorProfile(ctx, "alexmorgan")
	require.NoError(t, err)
	alexID := uuid.MustParse(userAlex.UserID)

	// 1. Fetch notifications for Alex
	notifications, _, unreadCount, err := commSvc.ListNotifications(ctx, alexID, 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, unreadCount, int64(0))

	if len(notifications) > 0 {
		notifID := uuid.MustParse(notifications[0].ID)
		err = commSvc.MarkNotificationAsRead(ctx, alexID, notifID)
		require.NoError(t, err)
	}

	// 2. Mark all as read
	err = commSvc.MarkAllNotificationsAsRead(ctx, alexID)
	require.NoError(t, err)

	count, err := commSvc.GetUnreadCount(ctx, alexID)
	require.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

