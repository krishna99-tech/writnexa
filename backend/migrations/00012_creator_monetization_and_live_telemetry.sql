-- ==============================================================================
-- 00012_creator_monetization_and_live_telemetry.sql
-- Creator Economy (Developer Tipping / Sponsorships) & Live Collaboration Telemetry
-- ==============================================================================

-- 1. Author Sponsorships & Micro-Tipping
CREATE TABLE IF NOT EXISTS author_sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    tier_name VARCHAR(64) NOT NULL DEFAULT 'Coffee & Server Support',
    donor_name VARCHAR(128) NOT NULL DEFAULT 'Anonymous Developer',
    donor_email VARCHAR(255),
    message TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_author_id ON author_sponsorships(author_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_article_id ON author_sponsorships(article_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_created_at ON author_sponsorships(created_at DESC);

-- 2. Peer Review & Architecture Guild Collaboration
CREATE TABLE IF NOT EXISTS article_peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
    verdict_summary TEXT,
    code_benchmarks_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(article_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_article ON article_peer_reviews(article_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON article_peer_reviews(reviewer_id);

-- 3. Live Concurrent Readers Telemetry Heartbeats
CREATE TABLE IF NOT EXISTS live_reading_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    visitor_hash VARCHAR(64) NOT NULL,
    scroll_depth_percent INT NOT NULL DEFAULT 0,
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_heartbeats_compound ON live_reading_heartbeats(article_id, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_live_heartbeats_last_ping ON live_reading_heartbeats(last_ping DESC);

