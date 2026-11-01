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

