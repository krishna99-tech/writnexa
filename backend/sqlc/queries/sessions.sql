-- name: CreateSession :one
INSERT INTO user_sessions (
    user_id,
    refresh_token_hash,
    user_agent,
    ip_address,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetSessionByTokenHash :one
SELECT * FROM user_sessions
WHERE refresh_token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()
LIMIT 1;

-- name: RevokeSession :exec
UPDATE user_sessions
SET
    is_revoked = TRUE,
    updated_at = NOW()
WHERE id = $1;

-- name: RevokeAllUserSessions :exec
UPDATE user_sessions
SET
    is_revoked = TRUE,
    updated_at = NOW()
WHERE user_id = $1;
