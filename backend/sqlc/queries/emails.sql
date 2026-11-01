-- name: EnqueueEmail :one
INSERT INTO email_outbox (
    recipient_email,
    recipient_name,
    template_name,
    subject,
    html_body,
    text_body,
    payload_json,
    status,
    max_retries,
    next_retry_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW()
)
RETURNING *;

-- name: FetchPendingEmails :many
SELECT * FROM email_outbox
WHERE status IN ('pending', 'sending')
  AND next_retry_at <= NOW()
ORDER BY created_at ASC
LIMIT $1
FOR UPDATE SKIP LOCKED;

-- name: MarkEmailSending :exec
UPDATE email_outbox
SET
    status = 'sending',
    updated_at = NOW()
WHERE id = $1;

-- name: MarkEmailSent :exec
UPDATE email_outbox
SET
    status = 'sent',
    ses_message_id = $2,
    sent_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: MarkEmailFailed :exec
UPDATE email_outbox
SET
    status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END,
    retry_count = retry_count + 1,
    next_retry_at = $2,
    last_error = $3,
    updated_at = NOW()
WHERE id = $1;

-- name: CreateEmailLog :one
INSERT INTO email_logs (
    outbox_id,
    recipient_email,
    subject,
    status,
    ses_message_id,
    error_message,
    attempt_number
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetEmailLogsByOutboxID :many
SELECT * FROM email_logs
WHERE outbox_id = $1
ORDER BY created_at ASC;

-- name: GetNotificationPreferences :one
SELECT * FROM notification_preferences
WHERE user_id = $1
LIMIT 1;

-- name: UpsertNotificationPreferences :one
INSERT INTO notification_preferences (
    user_id,
    email_on_new_follower,
    email_on_new_comment,
    email_on_reply,
    email_on_article_publish,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    email_on_new_follower = EXCLUDED.email_on_new_follower,
    email_on_new_comment = EXCLUDED.email_on_new_comment,
    email_on_reply = EXCLUDED.email_on_reply,
    email_on_article_publish = EXCLUDED.email_on_article_publish,
    updated_at = NOW()
RETURNING *;

