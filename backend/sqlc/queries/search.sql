-- Phase 9: Search and Discovery Queries

-- name: SearchArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    p.headline as author_headline,
    c.name as category_name, c.slug as category_slug,
    ts_rank_cd(a.search_vector, websearch_to_tsquery('english', @query::varchar)) as search_rank
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
  AND (
    @query::varchar = '' OR 
    a.search_vector @@ websearch_to_tsquery('english', @query::varchar) OR 
    a.title ILIKE '%' || @query::varchar || '%' OR
    p.username ILIKE '%' || @query::varchar || '%' OR
    p.display_name ILIKE '%' || @query::varchar || '%'
  )
  AND (
    @category_slug::varchar = '' OR 
    c.slug = @category_slug::varchar
  )
  AND (
    @tag_slug::varchar = '' OR 
    EXISTS (
      SELECT 1 FROM article_tags at 
      JOIN tags t ON at.tag_id = t.id 
      WHERE at.article_id = a.id AND t.slug = @tag_slug::varchar
    )
  )
ORDER BY
  CASE WHEN @sort_by::varchar = 'latest' THEN a.published_at END DESC NULLS LAST,
  CASE WHEN @sort_by::varchar = 'popular' THEN (a.likes_count * 3 + a.bookmarks_count * 2 + a.comments_count * 2 + a.views_count) END DESC NULLS LAST,
  CASE WHEN @sort_by::varchar = 'trending' THEN 
    (((a.likes_count * 3 + a.bookmarks_count * 2 + a.comments_count * 2 + a.views_count * 0.1) + 1.0) / 
     POWER((EXTRACT(EPOCH FROM (NOW() - a.published_at)) / 3600.0) + 2.0, 1.5))
  END DESC NULLS LAST,
  CASE WHEN @sort_by::varchar = 'relevance' OR @sort_by::varchar = '' THEN
    (ts_rank_cd(a.search_vector, websearch_to_tsquery('english', @query::varchar)) * (1.0 + 0.05 * ln(1.0 + a.likes_count)))
  END DESC NULLS LAST,
  a.published_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: CountSearchArticles :one
SELECT COUNT(*)
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
  AND (
    @query::varchar = '' OR 
    a.search_vector @@ websearch_to_tsquery('english', @query::varchar) OR 
    a.title ILIKE '%' || @query::varchar || '%' OR
    p.username ILIKE '%' || @query::varchar || '%' OR
    p.display_name ILIKE '%' || @query::varchar || '%'
  )
  AND (
    @category_slug::varchar = '' OR 
    c.slug = @category_slug::varchar
  )
  AND (
    @tag_slug::varchar = '' OR 
    EXISTS (
      SELECT 1 FROM article_tags at 
      JOIN tags t ON at.tag_id = t.id 
      WHERE at.article_id = a.id AND t.slug = @tag_slug::varchar
    )
  );

-- name: SearchAuthors :many
SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.headline,
    p.bio,
    p.avatar_url,
    p.github_url,
    p.twitter_url,
    p.linkedin_url,
    p.website_url,
    p.location,
    p.created_at as joined_at,
    p.article_count,
    p.follower_count,
    p.following_count,
    GREATEST(
      similarity(p.username, @query::varchar),
      similarity(p.display_name, @query::varchar),
      similarity(COALESCE(p.headline, ''), @query::varchar)
    ) as similarity_score
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.status = 'active'
  AND (
    @query::varchar = '' OR
    p.username ILIKE '%' || @query::varchar || '%' OR
    p.display_name ILIKE '%' || @query::varchar || '%' OR
    p.headline ILIKE '%' || @query::varchar || '%' OR
    p.bio ILIKE '%' || @query::varchar || '%'
  )
ORDER BY
  CASE WHEN @query::varchar <> '' THEN
    GREATEST(
      similarity(p.username, @query::varchar),
      similarity(p.display_name, @query::varchar),
      similarity(COALESCE(p.headline, ''), @query::varchar)
    )
  END DESC NULLS LAST,
  p.follower_count DESC,
  p.created_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: CountSearchAuthors :one
SELECT COUNT(*)
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.status = 'active'
  AND (
    @query::varchar = '' OR
    p.username ILIKE '%' || @query::varchar || '%' OR
    p.display_name ILIKE '%' || @query::varchar || '%' OR
    p.headline ILIKE '%' || @query::varchar || '%' OR
    p.bio ILIKE '%' || @query::varchar || '%'
  );

-- name: ListPopularArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.published_at, a.created_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug,
    (a.likes_count * 3 + a.bookmarks_count * 2 + a.comments_count * 2 + a.views_count) as activity_score
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'published' AND a.deleted_at IS NULL
ORDER BY (a.likes_count * 3 + a.bookmarks_count * 2 + a.comments_count * 2 + a.views_count) DESC, a.published_at DESC
LIMIT $1;
