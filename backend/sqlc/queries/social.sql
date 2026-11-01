-- name: CreateComment :one
INSERT INTO comments (
    article_id,
    author_id,
    parent_id,
    content
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListCommentsByArticleID :many
SELECT c.*, p.username, p.display_name, p.avatar_url
FROM comments c
JOIN profiles p ON c.author_id = p.user_id
WHERE c.article_id = $1 AND c.is_deleted = FALSE
ORDER BY c.created_at ASC;

-- name: MarkCommentDeleted :exec
UPDATE comments
SET is_deleted = TRUE, content = '[deleted]', updated_at = NOW()
WHERE id = $1;

-- name: CreateLike :one
INSERT INTO likes (user_id, article_id)
VALUES ($1, $2)
ON CONFLICT (user_id, article_id) DO NOTHING
RETURNING *;

-- name: DeleteLike :exec
DELETE FROM likes
WHERE user_id = $1 AND article_id = $2;

-- name: HasUserLikedArticle :one
SELECT EXISTS (
    SELECT 1 FROM likes
    WHERE user_id = $1 AND article_id = $2
) AS liked;

-- name: CreateBookmark :one
INSERT INTO bookmarks (user_id, article_id)
VALUES ($1, $2)
ON CONFLICT (user_id, article_id) DO NOTHING
RETURNING *;

-- name: DeleteBookmark :exec
DELETE FROM bookmarks
WHERE user_id = $1 AND article_id = $2;

-- name: HasUserBookmarkedArticle :one
SELECT EXISTS (
    SELECT 1 FROM bookmarks
    WHERE user_id = $1 AND article_id = $2
) AS bookmarked;

-- name: ListBookmarksByUserID :many
SELECT b.created_at as bookmarked_at, a.*, p.username as author_username, p.display_name as author_display_name
FROM bookmarks b
JOIN articles a ON b.article_id = a.id
JOIN profiles p ON a.author_id = p.user_id
WHERE b.user_id = $1 AND a.deleted_at IS NULL
ORDER BY b.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreateFollow :one
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) DO NOTHING
RETURNING *;

-- name: DeleteFollow :exec
DELETE FROM follows
WHERE follower_id = $1 AND following_id = $2;

-- name: IsFollowing :one
SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = $1 AND following_id = $2
) AS is_following;

-- name: CountCommentsByArticleID :one
SELECT COUNT(*) FROM comments
WHERE article_id = $1 AND is_deleted = FALSE;

-- name: GetCommentByID :one
SELECT c.*, p.username, p.display_name, p.avatar_url
FROM comments c
JOIN profiles p ON c.author_id = p.user_id
WHERE c.id = $1;

-- name: UpdateCommentContent :one
UPDATE comments
SET content = $2, is_edited = TRUE, updated_at = NOW()
WHERE id = $1 AND author_id = $3 AND is_deleted = FALSE
RETURNING *;

-- name: DeleteComment :one
UPDATE comments
SET is_deleted = TRUE, content = '[deleted]', updated_at = NOW()
WHERE id = $1 AND author_id = $2
RETURNING *;

-- name: ListFollowingFeed :many
SELECT 
    a.*,
    p.username as author_username,
    p.display_name as author_display_name,
    p.avatar_url as author_avatar_url,
    p.headline as author_headline,
    c.name as category_name,
    c.slug as category_slug
FROM articles a
JOIN follows f ON a.author_id = f.following_id
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE f.follower_id = $1
  AND a.status = 'published'
  AND a.deleted_at IS NULL
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFollowingFeed :one
SELECT COUNT(*)
FROM articles a
JOIN follows f ON a.author_id = f.following_id
WHERE f.follower_id = $1
  AND a.status = 'published'
  AND a.deleted_at IS NULL;

-- name: CreateInAppNotification :one
INSERT INTO in_app_notifications (
    recipient_id,
    actor_id,
    type,
    article_id,
    comment_id,
    title,
    message,
    action_url
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: ListInAppNotifications :many
SELECT 
    n.*,
    p.username as actor_username,
    p.display_name as actor_display_name,
    p.avatar_url as actor_avatar_url
FROM in_app_notifications n
JOIN profiles p ON n.actor_id = p.user_id
WHERE n.recipient_id = $1
ORDER BY n.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountUnreadNotifications :one
SELECT COUNT(*) FROM in_app_notifications
WHERE recipient_id = $1 AND is_read = FALSE;

-- name: MarkNotificationAsRead :exec
UPDATE in_app_notifications
SET is_read = TRUE
WHERE id = $1 AND recipient_id = $2;

-- name: MarkAllNotificationsAsRead :exec
UPDATE in_app_notifications
SET is_read = TRUE
WHERE recipient_id = $1;

