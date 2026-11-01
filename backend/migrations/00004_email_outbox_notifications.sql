-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(120) NOT NULL DEFAULT '',
    template_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    payload_json JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    ses_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON email_outbox (status, next_retry_at) WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient ON email_outbox (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON email_outbox (created_at DESC);

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id UUID REFERENCES email_outbox(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    ses_message_id VARCHAR(255),
    error_message TEXT,
    attempt_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_outbox_id ON email_logs (outbox_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_on_new_follower BOOLEAN NOT NULL DEFAULT true,
    email_on_new_comment BOOLEAN NOT NULL DEFAULT true,
    email_on_reply BOOLEAN NOT NULL DEFAULT true,
    email_on_article_publish BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS email_outbox CASCADE;
-- +goose StatementEnd

