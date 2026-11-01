-- name: CreateEmailVerificationToken :one
INSERT INTO email_verification_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetEmailVerificationToken :one
SELECT * FROM email_verification_tokens
WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
LIMIT 1;

-- name: MarkEmailVerificationTokenUsed :exec
UPDATE email_verification_tokens
SET used_at = NOW()
WHERE id = $1;

-- name: InvalidateUserVerificationTokens :exec
UPDATE email_verification_tokens
SET used_at = NOW()
WHERE user_id = $1 AND used_at IS NULL;

-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetPasswordResetToken :one
SELECT * FROM password_reset_tokens
WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
LIMIT 1;

-- name: MarkPasswordResetTokenUsed :exec
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = $1;

-- name: InvalidateUserPasswordResetTokens :exec
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE user_id = $1 AND used_at IS NULL;
