-- ==============================================================================
-- 00011_newsletter_subscriptions.sql
-- Newsletter and Technical Architectural Digest Subscription Engine
-- ==============================================================================

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    source VARCHAR(100) NOT NULL DEFAULT 'global_footer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(lower(email));
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);

