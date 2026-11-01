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
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetUserEmailVerified :exec
UPDATE users
SET
    email_verified_at = COALESCE(email_verified_at, NOW()),
    status = 'active',
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users
SET
    password_hash = $2,
    updated_at = NOW()
WHERE id = $1;

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
