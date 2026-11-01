-- +goose Up
-- Phase 9: Search and Discovery Architecture

-- 1. Enable pg_trgm extension for trigram similarity & regex indexing
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Trigger function to automatically maintain search_vector with title priority weighting ('A' > 'B' > 'C')
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;
CREATE TRIGGER trg_articles_search_vector
    BEFORE INSERT OR UPDATE OF title, subtitle, content
    ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_vector_update();

-- 3. Populate existing articles search_vector
UPDATE articles
SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'C')
WHERE search_vector IS NULL;

-- 4. Full-Text Search and Trigram Indexes
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON articles USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING GIN (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_headline_trgm ON profiles USING GIN (headline gin_trgm_ops);

-- 5. Discovery Indexes for Popular & Trending Feeds
CREATE INDEX IF NOT EXISTS idx_articles_popularity 
ON articles ((likes_count * 3 + bookmarks_count * 2 + comments_count * 2 + views_count) DESC, published_at DESC) 
WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_articles_freshness_discovery 
ON articles (published_at DESC) 
WHERE status = 'published' AND deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_articles_freshness_discovery;
DROP INDEX IF EXISTS idx_articles_popularity;
DROP INDEX IF EXISTS idx_profiles_headline_trgm;
DROP INDEX IF EXISTS idx_profiles_display_name_trgm;
DROP INDEX IF EXISTS idx_profiles_username_trgm;
DROP INDEX IF EXISTS idx_articles_search_vector;
DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;
DROP FUNCTION IF EXISTS articles_search_vector_update();
