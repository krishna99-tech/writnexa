-- ==============================================================================
-- 00010_user_profile_and_account_settings.sql
-- Complete User Profile, Account Settings, Preferences, Reading History, and Achievements
-- ==============================================================================

-- 1. EXTEND PROFILES WITH COVER BANNER AND REPUTATION
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS reputation_score INT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS reputation_tier VARCHAR(50) NOT NULL DEFAULT 'Apprentice';

-- 2. USER PREFERENCES & PRIVACY CONTROLS
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(32) NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers_only', 'private')),
    show_reading_history BOOLEAN NOT NULL DEFAULT false,
    theme VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EXTEND NOTIFICATION PREFERENCES WITH IN-APP TOGGLES
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS in_app_follower BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS in_app_comment BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS in_app_like BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS in_app_mention BOOLEAN NOT NULL DEFAULT true;

-- 4. READING HISTORY TRACKING
CREATE TABLE IF NOT EXISTS reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    scroll_percentage INT NOT NULL DEFAULT 0,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_article_history UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_history_user_read ON reading_history(user_id, read_at DESC);

-- 5. ACHIEVEMENTS & REPUTATION ENGINE
CREATE TABLE IF NOT EXISTS achievement_definitions (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    badge_color VARCHAR(50) NOT NULL DEFAULT 'emerald',
    points INT NOT NULL DEFAULT 50,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(50) NOT NULL REFERENCES achievement_definitions(key) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- 6. SEED PRE-DEFINED ACHIEVEMENTS
INSERT INTO achievement_definitions (key, name, description, icon_name, badge_color, points, sort_order) VALUES
('founding_architect', 'Founding Architect', 'Joined QUORIX during early development and helped shape platform architecture.', 'shield', 'amber', 250, 1),
('prolific_author', 'Prolific Author', 'Published multiple verified architectural deep dives with high code fidelity.', 'pen-tool', 'emerald', 200, 2),
('high_impact', 'High-Impact Insight', 'Published a deep dive that received 25+ bookmarks from systems engineers.', 'sparkles', 'purple', 150, 3),
('deep_reader', 'Deep Systems Reader', 'Completed thorough reading of 5+ technical architecture case studies.', 'book-open', 'blue', 100, 4),
('community_pillar', 'Community Pillar', 'Actively participated in technical discussions with architectural critique.', 'message-square', 'teal', 100, 5)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    badge_color = EXCLUDED.badge_color,
    points = EXCLUDED.points,
    sort_order = EXCLUDED.sort_order;

-- Automatically initialize user_preferences for existing users
INSERT INTO user_preferences (user_id, profile_visibility, show_reading_history, theme)
SELECT id, 'public', false, 'system'
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Award Founding Architect badge to existing verified authors and users
INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
SELECT id, 'founding_architect', NOW()
FROM users
ON CONFLICT (user_id, achievement_key) DO NOTHING;

