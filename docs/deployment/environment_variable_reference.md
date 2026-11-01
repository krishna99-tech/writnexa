# QUORIX Environment Variable Reference

This document provides a comprehensive specification of every environment variable required across QUORIX services.

---

## 1. Backend Core & Server

| Variable | Type | Default | Description |
|---|---|---|---|
| `APP_ENV` | string | `production` | Execution environment (`production`, `staging`, `development`). In `production`, debug routes are suppressed. |
| `APP_PORT` | integer | `8080` | Port on which the Go HTTP API binds. |
| `APP_LOG_LEVEL` | string | `info` | Minimum log severity level (`debug`, `info`, `warn`, `error`). Logs are structured JSON in production. |
| `APP_FRONTEND_URL` | string (URL) | `https://quorix.io` | Public origin of the Next.js web application for emails and auth redirects. |

---

## 2. PostgreSQL 16 Database

| Variable | Type | Default | Description |
|---|---|---|---|
| `DB_HOST` | string | `postgres` | Hostname or IP of PostgreSQL master node. |
| `DB_PORT` | integer | `5432` | PostgreSQL listening port. |
| `DB_USER` | string | `quorix_app` | Authenticated database role. Least privilege recommended. |
| `DB_PASSWORD` | string | *required* | Strong alphanumeric password for database user. |
| `DB_NAME` | string | `quorix_prod` | Target production database name. |
| `DB_SSL_MODE` | string | `require` | SSL connection mode (`disable`, `require`, `verify-full`). In production, use `verify-full` or `require`. |
| `DB_MAX_CONNS` | integer | `50` | Maximum connections allocated to the `pgxpool` connection pool. |
| `DB_MIN_CONNS` | integer | `10` | Minimum idle connections maintained in pool. |

---

## 3. Redis 7 Caching & Session Layer

| Variable | Type | Default | Description |
|---|---|---|---|
| `REDIS_HOST` | string | `redis` | Hostname or cluster endpoint for Redis 7. |
| `REDIS_PORT` | integer | `6379` | Port for Redis service. |
| `REDIS_PASSWORD` | string | *required* | Strong password for `AUTH`. |
| `REDIS_ENABLED` | boolean | `true` | Toggles Redis caching and session acceleration. |
| `REDIS_DB` | integer | `0` | Database index. |

---

## 4. Authentication & JWT Cryptography

| Variable | Type | Default | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | string | *required* | 256-bit (64 hex characters) cryptographic secret for signing short-lived access tokens. |
| `JWT_REFRESH_SECRET` | string | *required* | 256-bit (64 hex characters) cryptographic secret for rotating refresh tokens. |
| `JWT_ACCESS_TTL_MINUTES` | integer | `15` | Expiration window for access tokens (15 minutes). |
| `JWT_REFRESH_TTL_DAYS` | integer | `7` | Lifetime of refresh token session (7 days). |

---

## 5. Security & Network Configuration

| Variable | Type | Default | Description |
|---|---|---|---|
| `CORS_ALLOWED_ORIGINS` | comma-separated string | `https://quorix.io,https://www.quorix.io` | Strict origin whitelist for HTTP CORS headers. Wildcards are rejected. |

---

## 6. Amazon SES & Email System

| Variable | Type | Default | Description |
|---|---|---|---|
| `AWS_REGION` | string | `us-east-1` | AWS Region hosting the verified SES sending domain. |
| `AWS_SES_FROM_EMAIL` | string (email) | `notifications@quorix.io` | Verified RFC 5322 sending address. |
| `AWS_SES_FROM_NAME` | string | `QUORIX Platform` | Display name attached to transactional emails. |
| `AWS_ACCESS_KEY_ID` | string | *optional* | Static credentials if IAM instance role is not used. |
| `AWS_SECRET_ACCESS_KEY` | string | *optional* | Static secret if IAM instance role is not used. |

---

## 7. Frontend Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | string (URL) | `https://api.quorix.io` or `https://quorix.io` | Client-facing base URL for browser API requests. |
| `INTERNAL_API_URL` | string (URL) | `http://backend:8080` | Internal Docker network URL for server-side Next.js data fetching. |

