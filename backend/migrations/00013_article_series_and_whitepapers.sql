-- Migration: 00013_article_series_and_whitepapers.sql
-- Enables multi-part engineering series and academic whitepaper organization.

CREATE TABLE IF NOT EXISTS article_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_series_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES article_series(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(series_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_series_slug ON article_series(slug);
CREATE INDEX IF NOT EXISTS idx_article_series_items_series ON article_series_items(series_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_article_series_items_article ON article_series_items(article_id);

-- Seed Series 1: Mastering PostgreSQL Internals
DO $$
DECLARE
    v_author_id UUID;
    v_series_id UUID;
    v_art1_id UUID;
    v_art2_id UUID;
BEGIN
    SELECT id INTO v_art1_id FROM articles WHERE slug = 'postgresql-indexing-internals-btree-brin-gin';
    SELECT id INTO v_art2_id FROM articles WHERE slug = 'postgres-wal-replication-cdc-debezium';

    IF v_art1_id IS NOT NULL AND v_art2_id IS NOT NULL THEN
        SELECT author_id INTO v_author_id FROM articles WHERE id = v_art1_id;

        INSERT INTO article_series (author_id, title, slug, description)
        VALUES (
            v_author_id,
            'Mastering PostgreSQL Internals: From B-Trees to WAL & CDC',
            'mastering-postgresql-internals',
            'An end-to-end deep dive into PostgreSQL storage engines, indexing page layouts, WAL serialization, and real-time Change Data Capture.'
        )
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_series_id;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art1_id, 1)
        ON CONFLICT (series_id, article_id) DO NOTHING;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art2_id, 2)
        ON CONFLICT (series_id, article_id) DO NOTHING;
    END IF;
END $$;

-- Seed Series 2: High-Throughput Go Systems Architecture
DO $$
DECLARE
    v_author_id UUID;
    v_series_id UUID;
    v_art1_id UUID;
    v_art2_id UUID;
BEGIN
    SELECT id INTO v_art1_id FROM articles WHERE slug = 'go-concurrency-pipelines-fan-out';
    SELECT id INTO v_art2_id FROM articles WHERE slug = 'building-high-throughput-kafka-pipelines-go';

    IF v_art1_id IS NOT NULL AND v_art2_id IS NOT NULL THEN
        SELECT author_id INTO v_author_id FROM articles WHERE id = v_art1_id;

        INSERT INTO article_series (author_id, title, slug, description)
        VALUES (
            v_author_id,
            'High-Throughput Go Systems: Concurrency & Streaming Event Pipelines',
            'high-throughput-go-systems',
            'Architecting mission-critical Go microservices handling hundreds of thousands of events per second with zero allocations and backpressure control.'
        )
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_series_id;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art1_id, 1)
        ON CONFLICT (series_id, article_id) DO NOTHING;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art2_id, 2)
        ON CONFLICT (series_id, article_id) DO NOTHING;
    END IF;
END $$;

-- Seed Series 3: Linux Kernel Telemetry & Chaos Engineering
DO $$
DECLARE
    v_author_id UUID;
    v_series_id UUID;
    v_art1_id UUID;
    v_art2_id UUID;
BEGIN
    SELECT id INTO v_art1_id FROM articles WHERE slug = 'demystifying-ebpf-linux-kernel-observability';
    SELECT id INTO v_art2_id FROM articles WHERE slug = 'chaos-engineering-in-kubernetes-with-ebpf';

    IF v_art1_id IS NOT NULL AND v_art2_id IS NOT NULL THEN
        SELECT author_id INTO v_author_id FROM articles WHERE id = v_art1_id;

        INSERT INTO article_series (author_id, title, slug, description)
        VALUES (
            v_author_id,
            'Linux Kernel Observability & Chaos Engineering with eBPF',
            'linux-kernel-ebpf-chaos-engineering',
            'Harnessing programmable kernel probes, XDP packet filtering, and synthetic fault injection across Kubernetes clusters.'
        )
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_series_id;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art1_id, 1)
        ON CONFLICT (series_id, article_id) DO NOTHING;

        INSERT INTO article_series_items (series_id, article_id, order_index)
        VALUES (v_series_id, v_art2_id, 2)
        ON CONFLICT (series_id, article_id) DO NOTHING;
    END IF;
END $$;

