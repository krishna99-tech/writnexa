-- name: CreateProfile :one
INSERT INTO profiles (
    user_id,
    username,
    display_name,
    headline,
    bio,
    avatar_url,
    github_url,
    twitter_url,
    linkedin_url,
    website_url,
    location
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: GetProfileByUserID :one
SELECT * FROM profiles
WHERE user_id = $1
LIMIT 1;

-- name: GetProfileByUsername :one
SELECT * FROM profiles
WHERE LOWER(username) = LOWER($1)
LIMIT 1;

-- name: UpdateProfile :one
UPDATE profiles
SET
    display_name = COALESCE($2, display_name),
    headline = COALESCE($3, headline),
    bio = COALESCE($4, bio),
    avatar_url = COALESCE($5, avatar_url),
    github_url = COALESCE($6, github_url),
    twitter_url = COALESCE($7, twitter_url),
    linkedin_url = COALESCE($8, linkedin_url),
    website_url = COALESCE($9, website_url),
    location = COALESCE($10, location),
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: IncrementArticleCount :exec
UPDATE profiles
SET
    article_count = article_count + $2,
    updated_at = NOW()
WHERE user_id = $1;

-- name: UpdateFollowerCounts :exec
UPDATE profiles
SET
    follower_count = follower_count + $2,
    updated_at = NOW()
WHERE user_id = $1;

-- name: UpdateFollowingCounts :exec
UPDATE profiles
SET
    following_count = following_count + $2,
    updated_at = NOW()
WHERE user_id = $1;

-- name: ListPublicAuthors :many
SELECT p.*, u.role, u.status
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.status = 'active' AND u.deleted_at IS NULL
ORDER BY p.article_count DESC, p.follower_count DESC, p.created_at ASC
LIMIT $1 OFFSET $2;

-- name: UpdateProfileFull :one
UPDATE profiles
SET
    username = COALESCE(sqlc.narg('username'), username),
    display_name = COALESCE(sqlc.narg('display_name'), display_name),
    headline = COALESCE(sqlc.narg('headline'), headline),
    bio = COALESCE(sqlc.narg('bio'), bio),
    avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
    github_url = COALESCE(sqlc.narg('github_url'), github_url),
    twitter_url = COALESCE(sqlc.narg('twitter_url'), twitter_url),
    linkedin_url = COALESCE(sqlc.narg('linkedin_url'), linkedin_url),
    website_url = COALESCE(sqlc.narg('website_url'), website_url),
    location = COALESCE(sqlc.narg('location'), location),
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: CheckUsernameExistsExceptUser :one
SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER($1) AND user_id != $2
);

-- name: CountPublicAuthors :one
SELECT COUNT(*) FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.status = 'active' AND u.deleted_at IS NULL;

