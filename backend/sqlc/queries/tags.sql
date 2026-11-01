-- name: CreateTag :one
INSERT INTO tags (
    name,
    slug,
    description
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: ListTags :many
SELECT * FROM tags
ORDER BY usage_count DESC, name ASC
LIMIT $1 OFFSET $2;

-- name: GetTagBySlug :one
SELECT * FROM tags
WHERE slug = $1
LIMIT 1;

-- name: IncrementTagUsage :exec
UPDATE tags
SET
    usage_count = usage_count + $2,
    updated_at = NOW()
WHERE id = $1;

