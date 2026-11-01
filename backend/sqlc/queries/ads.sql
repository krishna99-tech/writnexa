-- name: GetPlacementBySlotKey :one
SELECT * FROM ad_placements
WHERE slot_key = $1;

-- name: ListAllPlacements :many
SELECT * FROM ad_placements
ORDER BY page_type, name ASC;

-- name: UpdatePlacement :one
UPDATE ad_placements
SET 
    name = $2,
    provider = $3,
    is_enabled = $4,
    format = $5,
    frequency_cap = $6,
    config = $7,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CreatePlacement :one
INSERT INTO ad_placements (
    slot_key, name, page_type, provider, is_enabled, format, frequency_cap, config
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetActiveCampaignForPlacement :one
SELECT * FROM ad_campaigns
WHERE status = 'active'
  AND start_date <= NOW()
  AND (end_date IS NULL OR end_date >= NOW())
  AND (cardinality(placements) = 0 OR @slot_key::text = ANY(placements))
ORDER BY RANDOM()
LIMIT 1;

-- name: GetCampaignByID :one
SELECT * FROM ad_campaigns
WHERE id = $1;

-- name: ListAllCampaigns :many
SELECT * FROM ad_campaigns
ORDER BY created_at DESC;

-- name: CreateCampaign :one
INSERT INTO ad_campaigns (
    name, advertiser, sponsor_label, headline, body, cta_text, target_url, image_url, format, placements, status, cpm, cpc, start_date, end_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
RETURNING *;

-- name: UpdateCampaign :one
UPDATE ad_campaigns
SET 
    name = $2,
    advertiser = $3,
    sponsor_label = $4,
    headline = $5,
    body = $6,
    cta_text = $7,
    target_url = $8,
    image_url = $9,
    format = $10,
    placements = $11,
    status = $12,
    cpm = $13,
    cpc = $14,
    start_date = $15,
    end_date = $16,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteCampaign :exec
DELETE FROM ad_campaigns
WHERE id = $1;

-- name: RecordAdImpression :exec
INSERT INTO ad_impressions (
    placement_id, campaign_id, provider, visitor_hash, path
) VALUES (
    $1, $2, $3, $4, $5
)
ON CONFLICT (placement_id, campaign_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date)) DO NOTHING;

-- name: RecordAdClick :exec
INSERT INTO ad_clicks (
    placement_id, campaign_id, provider, visitor_hash, target_url
) VALUES (
    $1, $2, $3, $4, $5
)
ON CONFLICT (placement_id, campaign_id, visitor_hash, ((created_at AT TIME ZONE 'UTC')::date)) DO NOTHING;

-- name: RecordAdError :one
INSERT INTO ad_errors (
    placement_key, provider, error_code, error_message, url
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListAdErrors :many
SELECT * FROM ad_errors
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetAdSummaryStats :one
SELECT
    COALESCE(COUNT(DISTINCT i.id), 0)::bigint AS total_impressions,
    COALESCE(COUNT(DISTINCT c.id), 0)::bigint AS total_clicks,
    COALESCE(
        CASE 
            WHEN COUNT(DISTINCT i.id) > 0 
            THEN (COUNT(DISTINCT c.id)::float / COUNT(DISTINCT i.id)::float) * 100.0
            ELSE 0.0 
        END, 
        0.0
    )::float AS ctr_percentage,
    COALESCE(
        (SELECT SUM(reported_revenue) FROM ad_provider_revenues WHERE date >= (@start_time::timestamptz)::date),
        0.0
    )::numeric AS provider_reported_revenue
FROM ad_impressions i
LEFT JOIN ad_clicks c ON c.placement_id = i.placement_id AND c.created_at >= @start_time::timestamptz
WHERE i.created_at >= @start_time::timestamptz;

-- name: GetAdTimeseries :many
SELECT 
    day_series.day::date AS date,
    COALESCE(i.imp_count, 0)::bigint AS impressions,
    COALESCE(c.clk_count, 0)::bigint AS clicks
FROM generate_series(
    (@start_time::timestamptz)::date,
    (@end_time::timestamptz)::date,
    '1 day'::interval
) AS day_series(day)
LEFT JOIN (
    SELECT 
        (created_at AT TIME ZONE 'UTC')::date AS day,
        COUNT(*) AS imp_count
    FROM ad_impressions
    WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
) i ON i.day = day_series.day::date
LEFT JOIN (
    SELECT 
        (created_at AT TIME ZONE 'UTC')::date AS day,
        COUNT(*) AS clk_count
    FROM ad_clicks
    WHERE created_at >= @start_time::timestamptz AND created_at <= @end_time::timestamptz
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
) c ON c.day = day_series.day::date
ORDER BY day_series.day ASC;

-- name: GetAdPlacementStats :many
SELECT 
    p.id AS placement_id,
    p.slot_key,
    p.name,
    p.page_type,
    p.provider,
    p.is_enabled,
    COALESCE(imp.total_impressions, 0)::bigint AS impressions,
    COALESCE(clk.total_clicks, 0)::bigint AS clicks,
    COALESCE(
        CASE 
            WHEN imp.total_impressions > 0 
            THEN (clk.total_clicks::float / imp.total_impressions::float) * 100.0
            ELSE 0.0 
        END, 
        0.0
    )::float AS ctr_percentage
FROM ad_placements p
LEFT JOIN (
    SELECT placement_id, COUNT(*) AS total_impressions
    FROM ad_impressions
    WHERE created_at >= @start_time::timestamptz
    GROUP BY placement_id
) imp ON imp.placement_id = p.id
LEFT JOIN (
    SELECT placement_id, COUNT(*) AS total_clicks
    FROM ad_clicks
    WHERE created_at >= @start_time::timestamptz
    GROUP BY placement_id
) clk ON clk.placement_id = p.id
ORDER BY impressions DESC;

-- name: GetAdCampaignStats :many
SELECT 
    c.id AS campaign_id,
    c.name,
    c.advertiser,
    c.sponsor_label,
    c.status,
    c.cpm,
    c.cpc,
    COALESCE(imp.total_impressions, 0)::bigint AS impressions,
    COALESCE(clk.total_clicks, 0)::bigint AS clicks,
    COALESCE(
        CASE 
            WHEN imp.total_impressions > 0 
            THEN (clk.total_clicks::float / imp.total_impressions::float) * 100.0
            ELSE 0.0 
        END, 
        0.0
    )::float AS ctr_percentage,
    (
        (COALESCE(imp.total_impressions, 0)::numeric / 1000.0 * c.cpm) + 
        (COALESCE(clk.total_clicks, 0)::numeric * c.cpc)
    )::numeric AS estimated_revenue
FROM ad_campaigns c
LEFT JOIN (
    SELECT campaign_id, COUNT(*) AS total_impressions
    FROM ad_impressions
    WHERE created_at >= @start_time::timestamptz
    GROUP BY campaign_id
) imp ON imp.campaign_id = c.id
LEFT JOIN (
    SELECT campaign_id, COUNT(*) AS total_clicks
    FROM ad_clicks
    WHERE created_at >= @start_time::timestamptz
    GROUP BY campaign_id
) clk ON clk.campaign_id = c.id
ORDER BY impressions DESC;

-- name: RecordProviderRevenue :one
INSERT INTO ad_provider_revenues (
    provider, date, reported_impressions, reported_clicks, reported_revenue, currency
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (provider, date) DO UPDATE
SET 
    reported_impressions = EXCLUDED.reported_impressions,
    reported_clicks = EXCLUDED.reported_clicks,
    reported_revenue = EXCLUDED.reported_revenue,
    currency = EXCLUDED.currency,
    updated_at = NOW()
RETURNING *;

-- name: ListProviderRevenues :many
SELECT * FROM ad_provider_revenues
WHERE date >= @start_date::date
ORDER BY date DESC;
