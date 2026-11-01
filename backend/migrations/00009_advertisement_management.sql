-- +goose Up
-- Phase 12: Modular Advertisement Management Architecture

-- 1. Advertisement Placements Table
CREATE TABLE IF NOT EXISTS ad_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_key VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    page_type VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'direct',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    format VARCHAR(32) NOT NULL DEFAULT 'banner',
    frequency_cap INT NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_placements_slot_key ON ad_placements (slot_key);
CREATE INDEX IF NOT EXISTS idx_ad_placements_page_type ON ad_placements (page_type);

-- 2. Direct Advertising Campaigns Table
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    advertiser VARCHAR(128) NOT NULL,
    sponsor_label VARCHAR(64) NOT NULL DEFAULT 'Sponsored',
    headline VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    cta_text VARCHAR(64) NOT NULL DEFAULT 'Learn More',
    target_url TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    format VARCHAR(32) NOT NULL DEFAULT 'native',
    placements TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    cpm NUMERIC(10, 4) NOT NULL DEFAULT 2.5000,
    cpc NUMERIC(10, 4) NOT NULL DEFAULT 0.3500,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns (start_date, end_date);

-- 3. Advertisement Impressions Log Table
CREATE TABLE IF NOT EXISTS ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    provider VARCHAR(32) NOT NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_impressions_dedup 
ON ad_impressions (placement_id, campaign_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date));

CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at ON ad_impressions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement ON ad_impressions (placement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON ad_impressions (campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;

-- 4. Advertisement Clicks Log Table
CREATE TABLE IF NOT EXISTS ad_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    provider VARCHAR(32) NOT NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    target_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_clicks_dedup 
ON ad_clicks (placement_id, campaign_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date));

CREATE INDEX IF NOT EXISTS idx_ad_clicks_created_at ON ad_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_placement ON ad_clicks (placement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign ON ad_clicks (campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;

-- 5. Advertisement Error Telemetry Table
CREATE TABLE IF NOT EXISTS ad_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_key VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    error_code VARCHAR(64) NOT NULL,
    error_message TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_errors_created_at ON ad_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_errors_placement ON ad_errors (placement_key);

-- 6. Third-Party Provider Reported Revenue Table (Distinct from internal estimates)
CREATE TABLE IF NOT EXISTS ad_provider_revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL,
    date DATE NOT NULL,
    reported_impressions INT NOT NULL DEFAULT 0,
    reported_clicks INT NOT NULL DEFAULT 0,
    reported_revenue NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ad_provider_date UNIQUE (provider, date)
);

CREATE INDEX IF NOT EXISTS idx_ad_provider_revenues_date ON ad_provider_revenues (date DESC);

-- 7. Seed Initial Placements
INSERT INTO ad_placements (slot_key, name, page_type, provider, is_enabled, format, config)
VALUES
    ('homepage_top', 'Homepage Header Banner', 'homepage', 'direct', true, 'banner', '{"min_height": 90, "adsense_slot_id": ""}'::jsonb),
    ('explore_feed', 'Explore Feed Native Card', 'explore', 'direct', true, 'feed', '{"min_height": 180, "adsense_slot_id": ""}'::jsonb),
    ('article_sidebar', 'Article Sidebar Sponsor', 'article', 'direct', true, 'sidebar', '{"min_height": 250, "adsense_slot_id": ""}'::jsonb),
    ('article_in_content', 'Article In-Content Banner', 'article', 'direct', true, 'banner', '{"min_height": 90, "adsense_slot_id": ""}'::jsonb),
    ('footer_banner', 'Global Footer Banner', 'global', 'direct', true, 'banner', '{"min_height": 90, "adsense_slot_id": ""}'::jsonb)
ON CONFLICT (slot_key) DO NOTHING;

-- 8. Seed Developer-Friendly Direct Campaign Sample
INSERT INTO ad_campaigns (name, advertiser, sponsor_label, headline, body, cta_text, target_url, image_url, format, status, cpm, cpc)
VALUES
    (
        'Neon Serverless Postgres',
        'Neon Inc.',
        'Sponsored by Neon',
        'Deploy Serverless Postgres in Milliseconds',
        'Scale down to zero, branch databases like git repositories, and build faster with serverless PostgreSQL designed for modern developer stacks.',
        'Try Neon Free',
        'https://neon.tech/?ref=quorix',
        'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
        'native',
        'active',
        3.5000,
        0.5000
    )
ON CONFLICT DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS ad_provider_revenues;
DROP TABLE IF EXISTS ad_errors;
DROP TABLE IF EXISTS ad_clicks;
DROP TABLE IF EXISTS ad_impressions;
DROP TABLE IF EXISTS ad_campaigns;
DROP TABLE IF EXISTS ad_placements;
