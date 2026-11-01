# QUORIX Final Production Architecture

This document describes the high-level architecture, module decomposition, data flow, and runtime topology of the QUORIX developer publishing and technical knowledge platform.

---

## 1. System Topology Overview

```
                                      [ Internet ]
                                           │
                                           ▼ (HTTPS / 443)
                             ┌───────────────────────────┐
                             │       Nginx Ingress       │
                             │  Rate Limiting, TLS, HSTS │
                             └─────────────┬─────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │                                           │
                     ▼ Path: /api/v1/*                           ▼ Path: /* (UI)
        ┌─────────────────────────┐                 ┌─────────────────────────┐
        │   Go Modular Backend    │                 │   Next.js 16 App SSR    │
        │      (Port 8080)        │                 │       (Port 3000)       │
        └────────────┬────────────┘                 └────────────┬────────────┘
                     │                                           │
                     ├───────────────────┐                       │
                     ▼                   ▼                       ▼
        ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
        │  PostgreSQL 16   │    │     Redis 7     │    │  Browser Client  │
        │ (pgxpool / sqlc) │    │ Cache & Sessions│    │  (React Hydrate) │
        └──────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## 2. Backend Modular Monolith Architecture

The backend is built in Go 1.23 using a clean modular monolith architecture with strict domain boundaries:

```
backend/
├── cmd/api/                  # Application bootstrap and dependency injection
├── internal/
│   ├── config/               # Strongly-typed environment configuration
│   ├── database/             # PostgreSQL pgxpool connection management
│   │   ├── migrations/       # Goose versioned database migrations
│   │   └── sqlc/             # Type-safe SQL query generation
│   ├── logger/               # Structured JSON slog logging with trace correlation
│   ├── middleware/           # Auth, RBAC, CORS, Request ID, Rate Limiter
│   ├── redis/                # Redis connection and distributed cache client
│   ├── response/             # Standardized API response formatters
│   ├── security/             # Media upload validation and SSRF prevention
│   └── modules/
│       ├── admin/            # Super Admin center, user management, audit logs
│       ├── ads/              # Modular advertisement management and telemetry
│       ├── analytics/        # Platform & author telemetry with privacy hashing
│       ├── auth/             # Argon2id authentication and refresh token rotation
│       ├── community/        # Follows, likes, bookmarks, threaded comments
│       ├── content/          # Public explorer, topics, tags, articles, authors
│       ├── email/            # Amazon SES relay with PostgreSQL outbox worker
│       ├── operations/       # Health checks, readiness probes, background worker monitoring
│       ├── search/           # Full-text search (tsvector) and trigram matching
│       └── studio/           # Author Studio, markdown preview, draft management
```

---

## 3. Frontend Architecture

The frontend is built on Next.js 16 with the App Router, React Server Components (RSC), and Tailwind CSS:

- **Server-Side Rendering (SSR)**: Dynamic metadata, OpenGraph tags, canonical links, and search indexing for articles (`/article/[slug]`), authors (`/author/[username]`), and discovery feeds.
- **Client Components**: Interactive markdown authoring studio with syntax highlighting, live KaTeX math preview, threaded discussions, and notification center.
- **Standalone Docker Output**: Configured with `output: "standalone"` for minimal container footprint.

---

## 4. Key Subsystems & Architectural Decisions

1. **Transactional Outbox for Email**: Notifications and verification emails write to `email_outbox` in the same transaction as state changes. A background worker picks up pending emails and dispatches them via Amazon SES with exponential backoff and dead-letter handling.
2. **PostgreSQL Full-Text Search**: Articles utilize weighted `tsvector` columns with English dictionaries (`A` for title, `B` for subtitle, `C` for content) and GIN indexes, avoiding external search cluster complexity.
3. **Privacy-Preserving Telemetry**: Visitor tracking hashes client IP and User-Agent with a daily rotating salt via SHA-256, strictly adhering to user privacy requirements.
4. **Resilient Background Processing**: Operations monitoring tracks worker health, connection pool metrics, memory pressure, and provides admin endpoints for retrying failed outbox jobs.

