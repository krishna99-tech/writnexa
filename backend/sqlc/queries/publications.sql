-- name: CreatePublication :one
INSERT INTO publications (
    name,
    slug,
    description,
    logo_url,
    banner_url,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetPublicationBySlug :one
SELECT * FROM publications
WHERE slug = $1
LIMIT 1;

-- name: GetPublicationByID :one
SELECT * FROM publications
WHERE id = $1
LIMIT 1;

-- name: AddPublicationMember :one
INSERT INTO publication_members (
    publication_id,
    user_id,
    role
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetPublicationMember :one
SELECT * FROM publication_members
WHERE publication_id = $1 AND user_id = $2
LIMIT 1;

-- name: ListPublicationMembers :many
SELECT pm.*, p.username, p.display_name, p.avatar_url
FROM publication_members pm
JOIN profiles p ON pm.user_id = p.user_id
WHERE pm.publication_id = $1
ORDER BY pm.joined_at ASC;
