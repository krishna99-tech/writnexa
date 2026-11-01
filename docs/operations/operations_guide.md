# QUORIX Platform Operations & Monitoring Guide

## 1. System Overview & Architecture

QUORIX operates as a high-performance Go modular monolith with a Next.js 16+ App Router frontend:
- **Backend API Engine**: Go (Gin HTTP framework, pgx connection pooling, sqlc database access).
- **Primary Data Store**: PostgreSQL 16 (relational schema, Goose migrations, UUID identifiers, full-text search).
- **Cache & Accelerator**: Redis 7 (sessions, rate limiting, and in-memory read caching).
- **Background Worker**: PostgreSQL-backed transactional email outbox with exponential backoff and Amazon SES dispatching.
- **Observability**: Structured JSON logging (`slog`), end-to-end request tracing via `X-Request-ID`, and in-memory ring-buffer latency tracking.

---

## 2. Health & Readiness Probes

### 2.1 Liveness Probe (`GET /health` or `GET /api/v1/health`)
- **Purpose**: Kubernetes or Docker container orchestrator liveness check. Verifies that the Go HTTP server process is responsive.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "status": "alive",
      "timestamp": "2026-11-01T18:15:00Z"
    }
  }
  ```

### 2.2 Readiness Probe (`GET /ready` or `GET /api/v1/ready`)
- **Purpose**: Verifies that the platform is connected to PostgreSQL 16 and ready to serve live traffic.
- **Response**:
  - `200 OK`: Database connected and accepting queries.
  - `503 Service Unavailable`: Database disconnected or connection pool exhausted.
  ```json
  {
    "success": true,
    "data": {
      "ready": true,
      "checks": {
        "database": "ready",
        "redis": "ready"
      },
      "timestamp": "2026-11-01T18:15:00Z"
    }
  }
  ```

### 2.3 Deep Operational Health (`GET /api/v1/admin/operations/health`)
- **Role Requirement**: `admin` or `super_admin`.
- **Telemetry Returned**:
  - **Go Runtime**: Uptime, Go version, CPU core count, active goroutines, memory allocation (Alloc, TotalAlloc, Sys, HeapAlloc, GC cycle count).
  - **PostgreSQL 16**: Ping roundtrip latency, pool size, active/idle connections, total database size, top table storage sizes.
  - **Redis 7**: Ping latency, enabled state, connection status.
  - **Email Outbox**: Status, SES delivery mode (`dev_mock`, `smtp_relay`, `aws_sdk_v2`), queued pending, sent, and failed job counts.
  - **API Telemetry**: Total HTTP requests, status code distribution (2xx, 3xx, 4xx, 5xx), 5xx error rate %, average latency, p50, p95, and p99 percentiles.

---

## 3. Structured Logging & Distributed Request Tracing

### 3.1 Request ID Tracking (`X-Request-ID`)
Every incoming HTTP request receives or generates an RFC 4122 UUID v4:
- Injected by `middleware.RequestID()`.
- Propagated through request headers: `X-Request-ID: <uuid>`.
- Injected into the request context and attached to all log records.
- In production, upstream load balancers (e.g. AWS ALB, Cloudflare, Traefik) pass their edge request ID, which Quorix respects and preserves.

### 3.2 Structured JSON Logging (`log/slog`)
Logs are formatted in JSON for ingestion into CloudWatch, Datadog, or Grafana Loki:
```json
{
  "time": "2026-11-01T18:15:02.124Z",
  "level": "INFO",
  "msg": "HTTP Request",
  "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "method": "POST",
  "path": "/api/v1/articles",
  "status": 201,
  "latency": "12.4ms",
  "client_ip": "198.51.100.42"
}
```

---

## 4. Background Task Failures & Recovery Mechanisms

### 4.1 Email Outbox Worker
- Implements a resilient transactional outbox pattern in PostgreSQL (`email_outbox`).
- Handles network failures or rate limits with exponential backoff (`next_retry_at = NOW() + 2^attempt * 15s`).
- Maximum retry attempts: 3. Upon reaching the limit, the job transitions to `failed` status and logs the error in `last_error`.

### 4.2 Manual & Bulk Task Recovery
Administrators can inspect and recover failed background jobs from the Operations Portal (`/admin/operations`):
- **Single Task Retry**: `POST /api/v1/admin/operations/retry-job/:id`
  - Resets `status = 'pending'`, `retry_count = 0`, `next_retry_at = NOW()`, and clears `last_error`.
- **Bulk Recovery**: `POST /api/v1/admin/operations/retry-all-jobs`
  - Atomically resets all failed tasks back to pending for worker pickup.

---

## 5. Security & Zero Secret Leakage Policy

- **No Secrets in Logs or APIs**: Database credentials, Argon2id password hashes, JWT signing secrets, and AWS SES credentials are never serialized in API responses or logs.
- **Sensitive Error Masking**: Public endpoints return generic error codes (`INTERNAL_ERROR`, `SERVICE_UNREADY`), while detailed stack traces are restricted to server-side logs.
- **RBAC Enforcement**: All administrative operational controls require verified JWT tokens with `admin` or `super_admin` roles.

