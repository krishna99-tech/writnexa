-- +goose Up
-- Phase 10: Super Admin Center, Audit Logs, and Moderation

-- 1. Administrative Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON admin_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs (target_type, target_id);

-- 2. Moderation Reports
CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON moderation_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON moderation_reports (target_type, target_id);

-- 3. Platform Configuration & Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default platform configurations
INSERT INTO platform_settings (key, value, description)
VALUES 
    ('site_name', 'QUORIX', 'Platform branding name'),
    ('allow_registrations', 'true', 'Toggle reader and author registrations'),
    ('require_email_verification', 'false', 'Require verified email to publish or comment'),
    ('moderation_queue_enabled', 'true', 'Enable user reporting and content moderation'),
    ('maintenance_mode', 'false', 'Put site in read-only maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS moderation_reports;
DROP TABLE IF EXISTS admin_audit_logs;

