-- Phase 11: Platform and Author Analytics Queries

-- name: RecordAnalyticsEvent :exec
INSERT INTO analytics_events (
    event_type, path, article_id, author_id, user_id, visitor_hash, referrer, source, device_type, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
)
ON CONFLICT (article_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date))
WHERE article_id IS NOT NULL
DO NOTHING;

-- name: GetPlatformAnalyticsOverview :one
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as total_page_views,
    COUNT(CASE WHEN event_type = 'article_view' THEN 1 END) as total_article_views,
    COUNT(DISTINCT visitor_hash) as unique_visitors,
    (SELECT COUNT(*) FROM users u WHERE u.created_at >= @start_time::timestamptz AND u.created_at <= @end_time::timestamptz) as new_registrations,
    (SELECT COUNT(*) FROM articles a WHERE a.status = 'published' AND a.published_at >= @start_time::timestamptz AND a.published_at <= @end_time::timestamptz) as published_articles,
    (SELECT COUNT(*) FROM comments c WHERE c.created_at >= @start_time::timestamptz AND c.created_at <= @end_time::timestamptz) as comments_posted,
    (SELECT COUNT(*) FROM likes l WHERE l.created_at >= @start_time::timestamptz AND l.created_at <= @end_time::timestamptz) as likes_given
FROM analytics_events
WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz;

-- name: GetPlatformTimeseries :many
SELECT 
    (created_at AT TIME ZONE 'UTC')::date as day,
    COUNT(*) as total_views,
    COUNT(CASE WHEN event_type = 'article_view' THEN 1 END) as article_views,
    COUNT(DISTINCT visitor_hash) as unique_visitors
FROM analytics_events
WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz
GROUP BY (created_at AT TIME ZONE 'UTC')::date
ORDER BY day ASC;

-- name: GetPlatformTrafficSources :many
SELECT 
    source,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM analytics_events WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz), 0)), 1)::float4 as percentage
FROM analytics_events
WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz
GROUP BY source
ORDER BY count DESC
LIMIT 10;

-- name: GetPlatformTopCategories :many
SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(e.id) as views_count,
    COUNT(DISTINCT e.article_id) as articles_count
FROM analytics_events e
JOIN articles a ON e.article_id = a.id
JOIN categories c ON a.category_id = c.id
WHERE e.created_at >= @start_time::timestamptz AND e.created_at <= @end_time::timestamptz
GROUP BY c.id, c.name, c.slug
ORDER BY views_count DESC
LIMIT 10;

-- name: GetPlatformTopArticles :many
SELECT 
    a.id,
    a.title,
    a.slug,
    p.username as author_username,
    p.display_name as author_display_name,
    COUNT(e.id) as views_count,
    COUNT(DISTINCT e.visitor_hash) as unique_visitors
FROM analytics_events e
JOIN articles a ON e.article_id = a.id
JOIN profiles p ON a.author_id = p.user_id
WHERE e.created_at >= @start_time::timestamptz AND e.created_at <= @end_time::timestamptz
GROUP BY a.id, a.title, a.slug, p.username, p.display_name
ORDER BY views_count DESC
LIMIT 10;

-- name: GetAuthorAnalyticsOverview :one
SELECT 
    COUNT(e.id) as total_views,
    COUNT(DISTINCT e.visitor_hash) as unique_visitors,
    (SELECT COUNT(*) FROM likes l JOIN articles a ON l.article_id = a.id WHERE a.author_id = @author_id AND l.created_at >= @start_time::timestamptz AND l.created_at <= @end_time::timestamptz) as total_likes,
    (SELECT COUNT(*) FROM bookmarks b JOIN articles a ON b.article_id = a.id WHERE a.author_id = @author_id AND b.created_at >= @start_time::timestamptz AND b.created_at <= @end_time::timestamptz) as total_bookmarks,
    (SELECT COUNT(*) FROM comments c JOIN articles a ON c.article_id = a.id WHERE a.author_id = @author_id AND c.created_at >= @start_time::timestamptz AND c.created_at <= @end_time::timestamptz) as total_comments
FROM analytics_events e
WHERE e.author_id = @author_id AND e.created_at >= @start_time::timestamptz AND e.created_at <= @end_time::timestamptz;

-- name: GetAuthorTimeseries :many
SELECT 
    (created_at AT TIME ZONE 'UTC')::date as day,
    COUNT(*) as total_views,
    COUNT(DISTINCT visitor_hash) as unique_visitors
FROM analytics_events
WHERE author_id = @author_id AND created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz
GROUP BY (created_at AT TIME ZONE 'UTC')::date
ORDER BY day ASC;

-- name: GetAuthorTrafficSources :many
SELECT 
    e.source,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM analytics_events ae WHERE ae.author_id = @author_id AND ae.created_at >= @start_time::timestamptz AND ae.created_at <= @end_time::timestamptz), 0)), 1)::float4 as percentage
FROM analytics_events e
WHERE e.author_id = @author_id AND e.created_at >= @start_time::timestamptz AND e.created_at <= @end_time::timestamptz
GROUP BY e.source
ORDER BY count DESC
LIMIT 10;

-- name: GetAuthorArticlePerformance :many
SELECT 
    a.id,
    a.title,
    a.slug,
    a.reading_time_minutes,
    a.status,
    a.published_at,
    COUNT(e.id) as views_count,
    COUNT(DISTINCT e.visitor_hash) as unique_visitors,
    a.likes_count,
    a.bookmarks_count,
    a.comments_count
FROM articles a
LEFT JOIN analytics_events e ON a.id = e.article_id AND e.created_at >= @start_time::timestamptz AND e.created_at <= @end_time::timestamptz
WHERE a.author_id = @author_id AND a.deleted_at IS NULL
GROUP BY a.id, a.title, a.slug, a.reading_time_minutes, a.status, a.published_at, a.likes_count, a.bookmarks_count, a.comments_count
ORDER BY views_count DESC, a.created_at DESC;

-- name: UpsertArticleDailyMetrics :exec
INSERT INTO article_daily_metrics (
    article_id, author_id, date, views, unique_visitors, likes, bookmarks, comments, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW()
)
ON CONFLICT (article_id, date) DO UPDATE
SET views = EXCLUDED.views,
    unique_visitors = EXCLUDED.unique_visitors,
    likes = EXCLUDED.likes,
    bookmarks = EXCLUDED.bookmarks,
    comments = EXCLUDED.comments,
    updated_at = NOW();

-- name: UpsertPlatformDailyMetrics :exec
INSERT INTO platform_daily_metrics (
    date, page_views, article_views, unique_visitors, new_registrations, active_users, published_articles, comments_posted, likes_given, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
)
ON CONFLICT (date) DO UPDATE
SET page_views = EXCLUDED.page_views,
    article_views = EXCLUDED.article_views,
    unique_visitors = EXCLUDED.unique_visitors,
    new_registrations = EXCLUDED.new_registrations,
    active_users = EXCLUDED.active_users,
    published_articles = EXCLUDED.published_articles,
    comments_posted = EXCLUDED.comments_posted,
    likes_given = EXCLUDED.likes_given,
    updated_at = NOW();
