-- name: CreateUser :one
INSERT INTO users (
    email,
    password_hash,
    role,
    status
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 AND deleted_at IS NULL
LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 AND deleted_at IS NULL
LIMIT 1;

-- name: UpdateUserStatus :one
UPDATE users
SET
    status = $2,
    email_verified_at = CASE WHEN $2 = 'active' THEN COALESCE(email_verified_at, NOW()) ELSE email_verified_at END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserLastLogin :exec
UPDATE users
SET
    last_login_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: SoftDeleteUser :exec
UPDATE users
SET
    deleted_at = NOW(),
    status = 'deactivated',
    updated_at = NOW()
WHERE id = $1;
