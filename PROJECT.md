# QUORIX — Master Project Specification & Vision

## 1. Executive Summary

**QUORIX** is a specialized, production-grade technical publishing ecosystem engineered specifically for software engineers, frontend/backend/full-stack developers, DevOps engineers, technical writers, engineering students, and open-source contributors.

Unlike generic blogging or CMS platforms, QUORIX is purpose-built to handle complex developer workflows:
- First-class code syntax highlighting, diff viewing, and one-click code copying.
- Deep Markdown-driven authoring with real-time preview and revision tracking.
- High-performance, SEO-optimized public reading experiences with zero login barriers.
- Robust guest participation boundaries where reading is universal, while engagement (commenting, liking, bookmarking, following) and authoring are secured.
- Unified single-backend architecture powering Public Explorer, Author Studio, and Super Admin Center.

---

## 2. Target Audience & Personas

| Persona | Core Needs | Primary Surface |
|---|---|---|
| **Guest Reader / Student** | Fast page loads, zero paywalls/login gates to read, clean typography, code snippets, search, tags | Public Explorer (`/`, `/article/:slug`, `/author/:username`, `/search`, `/tag/:slug`) |
| **Active Developer Reader** | Bookmarking articles, commenting on implementation details, upvoting/liking, following domain experts | Public Explorer (with authenticated user session) |
| **Technical Author / Contributor** | Frictionless Markdown editor, code blocks with line numbers/copy, draft auto-save, series creation, view & read metrics | Author Studio (`/studio`, `/studio/articles`, `/studio/editor`, `/studio/analytics`) |
| **Publication Lead / Editor** | Multi-author publication curation, reviewing drafts submitted to publication, publication branding | Author Studio & Publications (`/publication/:slug`) |
| **Platform Moderator & Administrator** | User moderation, spam report resolution, platform-wide audit logs, advertisement management, system health | Super Admin Center (`/admin`) |

---

## 3. The Three Distinct Experiences

```
                                  ┌──────────────────────────────┐
                                  │      QUORIX Platform         │
                                  └──────────────┬───────────────┘
                     ┌───────────────────────────┼───────────────────────────┐
                     ▼                           ▼                           ▼
        ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
        │     Public Explorer     │ │      Author Studio      │ │   Super Admin Center    │
        ├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
        │ • Read articles freely  │ │ • Markdown editor       │ │ • Platform metrics      │
        │ • Browse topics & tags  │ │ • Live syntax preview   │ │ • User & author roles   │
        │ • Global search         │ │ • Drafts & revisions    │ │ • Content moderation    │
        │ • Public author profile │ │ • Series management     │ │ • Advertisement engine  │
        │ • Follow, like, comment │ │ • Analytics & views     │ │ • SES email ops & logs  │
        │   (requires login)      │ │ • Publication workflows │ │ • Audit logs & settings │
        └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
                     │                           │                           │
                     └───────────────────────────┼───────────────────────────┘
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     Unified Go Backend       │
                                  │   Single Database & Auth     │
                                  └──────────────────────────────┘
```

### A. Public Explorer
- **Unrestricted Access**: Guests can read complete articles, search content, explore tags, and inspect author profiles without an account.
- **Participation Gates**: Interactive actions (Like, Bookmark, Comment, Follow) trigger a non-disruptive authentication modal or redirect. Upon sign-in, the user is redirected precisely back to their original scroll/reading position.
- **Editorial & Technical Aesthetic**: Clean monospace accents, accessible contrast ratios, minimal chrome, and fast Server-Side Rendering (SSR).

### B. Author Studio
- **Accessible to All Registered Users**: Any registered user can instantly create and publish articles without a separate onboarding silo.
- **Authoring Engine**: Split-pane or toggleable live preview Markdown editor, code syntax highlighting across 50+ languages, code copy buttons, image drag-and-drop upload with S3 storage, tag auto-complete, series grouping.
- **Publishing Lifecycle**: Auto-saving drafts, version snapshots (`article_versions`), scheduling/publishing, archiving, and real-time reading time computation.
- **Analytics**: Accurate view counts, unique readers, engagement rate, and historical trends.

### C. Super Admin Center
- **Protected Surface (`/admin`)**: Restricted via strict backend Role-Based Access Control (RBAC: `admin`, `super_admin`, `moderator`).
- **Platform Governance**: Author approvals, article takedown/flags, abuse reporting triage, audit logging (`admin_audit_logs`).
- **Revenue & Ads**: Control over banner and native developer advertisement placements, frequency capping, real impressions and click tracking.
- **System Operations**: Live database pool stats, Redis cache hit rates, email outbox queues, SES delivery logs, and platform runtime settings.

---

## 4. Fundamental Platform Rules

1. **READ WITHOUT LOGIN**: Guests are first-class readers. No forced popups, no truncated paywalls, and no login required for reading full articles.
2. **PARTICIPATE WITH LOGIN**: Interacting (liking, commenting, bookmarking, following) requires an authenticated account.
3. **PUBLISH WITH AN AUTHENTICATED AUTHOR ACCOUNT**: Every user can author. Articles are attributed to verified accounts and can optionally belong to a Publication.
4. **SECURE BACKEND ENFORCEMENT**: Frontend route guards provide UX ergonomics; backend middleware enforces 100% of security checks, tokens, permissions, and roles.
5. **ZERO FABRICATED METRICS**: Analytics, impressions, and clicks are strictly counted and deduplicated through transactional and Redis-backed pipelines.
6. **NO FAKE OR MOCK DATA IN PRODUCTION**: Development modes support local mocks (e.g. Mailpit for SES, local disk for S3), but all code paths follow identical interfaces as cloud services.

---

## 5. Technology Stack Summary

| Layer | Technology | Justification |
|---|---|---|
| **Frontend Framework** | Next.js 15+ (App Router) | High-performance SSR for Public Explorer SEO; React Server Components (RSC) for zero-JS reading; Client Components for Studio & Admin. |
| **Language & Styling** | TypeScript, Tailwind CSS, shadcn/ui | Type safety across API contracts, consistent editorial design tokens, lightweight modular components. |
| **Backend Core** | Go 1.26 + Gin Web Framework | High throughput, sub-millisecond routing overhead, memory safety, explicit concurrency, single statically-linked binary. |
| **Database Engine** | PostgreSQL 16 | ACID transactions, native full-text search (`tsvector`), JSONB for rich article metadata, relational integrity. |
| **Database Access** | `pgx/v5` + `sqlc` + `pressly/goose` | Native high-performance pgx connection pooling, compile-time verified Go type generation from raw SQL, reversible SQL migrations. |
| **Cache & Sessions** | Redis 7 (Alpine) | Rotating session invalidation, rate limiting, trending article scoring, view deduplication buffers. |
| **Media Storage** | AWS S3 / Compatible Object Storage | Direct presigned uploads for author images; public CDN distribution; local fallback in dev. |
| **Email Delivery** | Amazon SES via AWS SDK for Go v2 | Transactional outbox table pattern with asynchronous worker, retry backoff, and Mailpit local capture. |
| **Infrastructure** | Docker, Docker Compose, Nginx | Predictable containerized development, production multi-stage builds, edge reverse proxy. |
