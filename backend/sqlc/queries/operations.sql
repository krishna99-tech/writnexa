-- name: GetEmailOutboxStats :one
SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0)::bigint AS pending_count,
    COALESCE(COUNT(*) FILTER (WHERE status = 'sending'), 0)::bigint AS sending_count,
    COALESCE(COUNT(*) FILTER (WHERE status = 'sent'), 0)::bigint AS sent_count,
    COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0)::bigint AS failed_count,
    COALESCE(COUNT(*), 0)::bigint AS total_count
FROM email_outbox;

-- name: ListFailedEmailJobs :many
SELECT 
    id,
    recipient_email,
    template_name,
    subject,
    status,
    retry_count,
    max_retries,
    last_error,
    created_at,
    updated_at
FROM email_outbox
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT $1 OFFSET $2;

-- name: RetryFailedEmailJob :one
UPDATE email_outbox
SET 
    status = 'pending',
    retry_count = 0,
    next_retry_at = NOW(),
    last_error = NULL,
    updated_at = NOW()
WHERE id = $1 AND status = 'failed'
RETURNING *;

-- name: RetryAllFailedEmailJobs :exec
UPDATE email_outbox
SET 
    status = 'pending',
    retry_count = 0,
    next_retry_at = NOW(),
    last_error = NULL,
    updated_at = NOW()
WHERE status = 'failed';
