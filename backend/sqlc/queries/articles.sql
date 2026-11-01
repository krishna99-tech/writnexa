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
SELECT 
    a.*, 
    p.username as author_username, 
    p.display_name as author_display_name, 
    p.avatar_url as author_avatar_url,
    p.headline as author_headline,
    c.name as category_name,
    c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
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

-- name: CountPublishedArticles :one
SELECT COUNT(*) FROM articles
WHERE status = 'published' AND deleted_at IS NULL;

-- name: ListPublishedArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
ORDER BY a.published_at DESC
LIMIT $1 OFFSET $2;

-- name: ListFeaturedArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.featured = TRUE AND a.deleted_at IS NULL
ORDER BY a.published_at DESC
LIMIT $1;

-- name: ListTrendingArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
ORDER BY (a.likes_count * 3 + a.comments_count * 5 + a.views_count) DESC, a.published_at DESC
LIMIT $1;

-- name: ListArticlesByCategory :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND c.slug = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: CountArticlesByCategory :one
SELECT COUNT(*) FROM articles a
JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND c.slug = $1;

-- name: ListArticlesByTag :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
JOIN article_tags at ON a.id = at.article_id
JOIN tags t ON at.tag_id = t.id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND t.slug = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: CountArticlesByTag :one
SELECT COUNT(*) FROM articles a
JOIN article_tags at ON a.id = at.article_id
JOIN tags t ON at.tag_id = t.id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND t.slug = $1;

-- name: ListArticlesByAuthor :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND p.username = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: CountArticlesByAuthor :one
SELECT COUNT(*) FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE a.status = 'published' AND a.deleted_at IS NULL AND p.username = $1;

-- name: SearchPublishedArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug,
    ts_rank(a.search_vector, plainto_tsquery('english', $1)) as rank
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
  AND (a.search_vector @@ plainto_tsquery('english', $1) OR a.title ILIKE '%' || $1 || '%')
ORDER BY rank DESC, a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: CountSearchPublishedArticles :one
SELECT COUNT(*) FROM articles a
WHERE a.status = 'published' AND a.deleted_at IS NULL
  AND (a.search_vector @@ plainto_tsquery('english', $1) OR a.title ILIKE '%' || $1 || '%');

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

-- name: GetAuthorArticleStats :one
SELECT 
    COUNT(*) as total_articles,
    COALESCE(SUM(views_count), 0)::bigint as total_views,
    COALESCE(SUM(likes_count), 0)::bigint as total_likes,
    COALESCE(SUM(comments_count), 0)::bigint as total_comments,
    COALESCE(SUM(bookmarks_count), 0)::bigint as total_bookmarks
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE LOWER(p.username) = LOWER($1) AND a.status = 'published' AND a.deleted_at IS NULL;

