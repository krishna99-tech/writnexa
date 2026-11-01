-- name: CreateCategory :one
INSERT INTO categories (
    name,
    slug,
    description,
    icon_name,
    sort_order
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListCategories :many
SELECT * FROM categories
ORDER BY sort_order ASC, name ASC;

-- name: GetCategoryBySlug :one
SELECT * FROM categories
WHERE slug = $1
LIMIT 1;

