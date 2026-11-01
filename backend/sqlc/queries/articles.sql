-- name: CreateArticle :one
INSERT INTO articles (
    author_id,
    publication_id,
    category_id,
    title,
    slug,
    subtitle,
    content,
    content_html,
    cover_image_url,
    canonical_url,
    status,
    reading_time_minutes,
    published_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: GetArticleByID :one
SELECT * FROM articles
WHERE id = $1 AND deleted_at IS NULL
LIMIT 1;

-- name: GetArticleBySlug :one
SELECT a.*, p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE a.slug = $1 AND a.status = 'published' AND a.deleted_at IS NULL
LIMIT 1;

-- name: UpdateArticle :one
UPDATE articles
SET
    category_id = COALESCE($2, category_id),
    title = COALESCE($3, title),
    slug = COALESCE($4, slug),
    subtitle = COALESCE($5, subtitle),
    content = COALESCE($6, content),
    content_html = COALESCE($7, content_html),
    cover_image_url = COALESCE($8, cover_image_url),
    canonical_url = COALESCE($9, canonical_url),
    status = COALESCE($10, status),
    reading_time_minutes = COALESCE($11, reading_time_minutes),
    published_at = CASE WHEN $10 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteArticle :exec
UPDATE articles
SET
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: ListPublishedArticles :many
SELECT a.*, p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE a.status = 'published' AND a.deleted_at IS NULL
ORDER BY a.published_at DESC
LIMIT $1 OFFSET $2;

-- name: ListFeaturedArticles :many
SELECT a.*, p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE a.status = 'published' AND a.featured = TRUE AND a.deleted_at IS NULL
ORDER BY a.published_at DESC
LIMIT $1;

-- name: IncrementArticleViews :exec
UPDATE articles
SET views_count = views_count + 1
WHERE id = $1;

-- name: IncrementArticleLikes :exec
UPDATE articles
SET likes_count = likes_count + $2
WHERE id = $1;

-- name: IncrementArticleBookmarks :exec
UPDATE articles
SET bookmarks_count = bookmarks_count + $2
WHERE id = $1;

-- name: IncrementArticleComments :exec
UPDATE articles
SET comments_count = comments_count + $2
WHERE id = $1;

-- name: AddArticleTag :exec
INSERT INTO article_tags (article_id, tag_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveArticleTags :exec
DELETE FROM article_tags
WHERE article_id = $1;

-- name: GetArticleTags :many
SELECT t.* FROM tags t
JOIN article_tags at ON t.id = at.tag_id
WHERE at.article_id = $1;
