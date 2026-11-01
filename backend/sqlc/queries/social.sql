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
