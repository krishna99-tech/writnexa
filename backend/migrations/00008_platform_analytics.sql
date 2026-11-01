-- +goose Up
-- Phase 11: Platform Analytics, Telemetry & Aggregation Architecture

-- 1. Raw Analytics Events Table (Privacy-Preserving Telemetry)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    path VARCHAR(255) NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    referrer VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'direct',
    device_type VARCHAR(32) NOT NULL DEFAULT 'desktop',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate view counting per visitor per article per calendar date
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_article_dedup 
ON analytics_events (article_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date)) 
WHERE article_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_author ON analytics_events (author_id, created_at DESC) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_article ON analytics_events (article_id, created_at DESC) WHERE article_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_source ON analytics_events (source);

-- 2. Article Daily Aggregation Table (Author Isolation & Fast Queries)
CREATE TABLE IF NOT EXISTS article_daily_metrics (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INT NOT NULL DEFAULT 0,
    unique_visitors INT NOT NULL DEFAULT 0,
    likes INT NOT NULL DEFAULT 0,
    bookmarks INT NOT NULL DEFAULT 0,
    comments INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (article_id, date)
);
CREATE INDEX IF NOT EXISTS idx_article_metrics_author_date ON article_daily_metrics (author_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_article_metrics_date ON article_daily_metrics (date DESC);

-- 3. Platform Daily Aggregation Table (Executive & System Telemetry)
CREATE TABLE IF NOT EXISTS platform_daily_metrics (
    date DATE PRIMARY KEY,
    page_views INT NOT NULL DEFAULT 0,
    article_views INT NOT NULL DEFAULT 0,
    unique_visitors INT NOT NULL DEFAULT 0,
    new_registrations INT NOT NULL DEFAULT 0,
    active_users INT NOT NULL DEFAULT 0,
    published_articles INT NOT NULL DEFAULT 0,
    comments_posted INT NOT NULL DEFAULT 0,
    likes_given INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS platform_daily_metrics;
DROP TABLE IF EXISTS article_daily_metrics;
DROP TABLE IF EXISTS analytics_events;
