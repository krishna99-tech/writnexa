-- Phase 10: Super Admin Center Queries

-- name: GetAdminDashboardStats :one
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_registrations_7d,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_registrations_30d,
    (SELECT COUNT(*) FROM profiles WHERE article_count > 0 OR user_id IN (SELECT id FROM users WHERE role IN ('author', 'admin', 'super_admin'))) as total_authors,
    (SELECT COUNT(*) FROM articles WHERE status = 'published' AND deleted_at IS NULL) as published_articles,
    (SELECT COUNT(*) FROM articles WHERE status = 'draft' AND deleted_at IS NULL) as draft_articles,
    (SELECT COUNT(*) FROM articles WHERE status = 'archived' OR deleted_at IS NOT NULL) as archived_articles,
    (SELECT COUNT(*) FROM comments WHERE is_deleted = false) as total_comments,
    (SELECT COALESCE(SUM(views_count), 0)::bigint FROM articles) as total_views,
    (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE created_at >= NOW() - INTERVAL '24 hours') as daily_active_users,
    (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_active_users,
    (SELECT COUNT(*) FROM moderation_reports WHERE status = 'pending') as pending_reports;

-- name: AdminListUsers :many
SELECT 
    u.id, u.email, u.role, u.status, (u.email_verified_at IS NOT NULL)::boolean as email_verified, u.created_at, u.updated_at,
    p.username, p.display_name, p.avatar_url, p.headline, p.article_count, p.follower_count, p.following_count
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE (
    @query::varchar = '' OR 
    u.email ILIKE '%' || @query::varchar || '%' OR 
    p.username ILIKE '%' || @query::varchar || '%' OR 
    p.display_name ILIKE '%' || @query::varchar || '%'
  )
  AND (@role::varchar = '' OR u.role = @role::varchar)
  AND (@status::varchar = '' OR u.status = @status::varchar)
ORDER BY u.created_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: AdminCountUsers :one
SELECT COUNT(*)
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE (
    @query::varchar = '' OR 
    u.email ILIKE '%' || @query::varchar || '%' OR 
    p.username ILIKE '%' || @query::varchar || '%' OR 
    p.display_name ILIKE '%' || @query::varchar || '%'
  )
  AND (@role::varchar = '' OR u.role = @role::varchar)
  AND (@status::varchar = '' OR u.status = @status::varchar);

-- name: AdminGetUserDetail :one
SELECT 
    u.id, u.email, u.role, u.status, (u.email_verified_at IS NOT NULL)::boolean as email_verified, u.created_at, u.updated_at,
    p.username, p.display_name, p.headline, p.bio, p.avatar_url, p.github_url, p.twitter_url, p.linkedin_url, p.website_url, p.location,
    p.article_count, p.follower_count, p.following_count,
    (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id)::int as active_sessions_count
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.id = $1
LIMIT 1;

-- name: AdminUpdateUserStatus :exec
UPDATE users
SET status = @status::varchar, updated_at = NOW()
WHERE id = @id;

-- name: AdminUpdateUserRole :exec
UPDATE users
SET role = @role::varchar, updated_at = NOW()
WHERE id = @id;

-- name: AdminListArticles :many
SELECT 
    a.id, a.author_id, a.category_id, a.title, a.slug, a.subtitle, a.cover_image_url,
    a.reading_time_minutes, a.views_count, a.likes_count, a.bookmarks_count, a.comments_count,
    a.featured, a.status, a.published_at, a.created_at, a.updated_at, a.deleted_at,
    p.username as author_username, p.display_name as author_display_name, p.avatar_url as author_avatar_url,
    c.name as category_name, c.slug as category_slug
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
LEFT JOIN categories c ON a.category_id = c.id
WHERE (
    @query::varchar = '' OR 
    a.title ILIKE '%' || @query::varchar || '%' OR 
    p.username ILIKE '%' || @query::varchar || '%'
  )
  AND (@status::varchar = '' OR a.status = @status::varchar)
ORDER BY a.created_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: AdminCountArticles :one
SELECT COUNT(*)
FROM articles a
JOIN profiles p ON a.author_id = p.user_id
WHERE (
    @query::varchar = '' OR 
    a.title ILIKE '%' || @query::varchar || '%' OR 
    p.username ILIKE '%' || @query::varchar || '%'
  )
  AND (@status::varchar = '' OR a.status = @status::varchar);

-- name: AdminToggleFeatureArticle :exec
UPDATE articles
SET featured = @featured::boolean, updated_at = NOW()
WHERE id = @id;

-- name: AdminArchiveArticle :exec
UPDATE articles
SET status = 'archived', updated_at = NOW()
WHERE id = @id;

-- name: CreateAuditLog :exec
INSERT INTO admin_audit_logs (
    actor_id, actor_email, actor_role, action, target_type, target_id, details, ip_address, user_agent, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
);

-- name: AdminListAuditLogs :many
SELECT 
    l.id, l.actor_id, l.actor_email, l.actor_role, l.action, l.target_type, l.target_id,
    l.details, l.ip_address, l.user_agent, l.created_at,
    p.username as actor_username, p.display_name as actor_display_name
FROM admin_audit_logs l
LEFT JOIN profiles p ON l.actor_id = p.user_id
WHERE (@action::varchar = '' OR l.action = @action::varchar)
  AND (@target_type::varchar = '' OR l.target_type = @target_type::varchar)
ORDER BY l.created_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: AdminCountAuditLogs :one
SELECT COUNT(*)
FROM admin_audit_logs l
WHERE (@action::varchar = '' OR l.action = @action::varchar)
  AND (@target_type::varchar = '' OR l.target_type = @target_type::varchar);

-- name: CreateModerationReport :one
INSERT INTO moderation_reports (
    reporter_id, target_type, target_id, reason, details
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: AdminListModerationReports :many
SELECT 
    r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.details, r.status,
    r.resolved_by, r.resolution_notes, r.resolved_at, r.created_at, r.updated_at,
    p_rep.username as reporter_username, p_rep.display_name as reporter_display_name,
    p_res.username as resolver_username, p_res.display_name as resolver_display_name
FROM moderation_reports r
LEFT JOIN profiles p_rep ON r.reporter_id = p_rep.user_id
LEFT JOIN profiles p_res ON r.resolved_by = p_res.user_id
WHERE (@status::varchar = '' OR r.status = @status::varchar)
  AND (@target_type::varchar = '' OR r.target_type = @target_type::varchar)
ORDER BY 
  CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END ASC,
  r.created_at DESC
LIMIT @lim::int OFFSET @off::int;

-- name: AdminCountModerationReports :one
SELECT COUNT(*)
FROM moderation_reports r
WHERE (@status::varchar = '' OR r.status = @status::varchar)
  AND (@target_type::varchar = '' OR r.target_type = @target_type::varchar);

-- name: AdminResolveModerationReport :exec
UPDATE moderation_reports
SET status = @status::varchar,
    resolved_by = @resolved_by,
    resolution_notes = @resolution_notes,
    resolved_at = NOW(),
    updated_at = NOW()
WHERE id = @id;

-- name: ListPlatformSettings :many
SELECT key, value, description, updated_by, updated_at
FROM platform_settings
ORDER BY key ASC;

-- name: UpdatePlatformSetting :exec
UPDATE platform_settings
SET value = @value::text,
    updated_by = @updated_by,
    updated_at = NOW()
WHERE key = @key::varchar;
