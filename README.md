# QUORIX

QUORIX is a specialized, production-oriented developer publishing and technical knowledge-sharing platform built with a Go modular monolith backend, Next.js App Router frontend, PostgreSQL 16, Redis 7, and Amazon SES.

## Architectural & Planning Documentation

All detailed project specifications, architectural blueprints, database designs, API specifications, and phased roadmaps are located in the [`docs/`](file:///c:/Users/vakav/Documents/vercel/quorix/docs) directory:

- [**docs/PROJECT.md**](file:///c:/Users/vakav/Documents/vercel/quorix/docs/PROJECT.md): Product vision, target developer personas, core three pillars, platform principles, and technology stack.
- [**docs/ARCHITECTURE.md**](file:///c:/Users/vakav/Documents/vercel/quorix/docs/ARCHITECTURE.md): High-level system architecture, Next.js frontend structure, Go modular monolith design, email outbox pattern, infrastructure, and architectural decision records.
- [**docs/DATABASE_DESIGN.md**](file:///c:/Users/vakav/Documents/vercel/quorix/docs/DATABASE_DESIGN.md): PostgreSQL 16 Entity-Relationship Diagram (ERD), normalized table schemas, compound indexes, and full-text search indexing.
- [**docs/API_DESIGN.md**](file:///c:/Users/vakav/Documents/vercel/quorix/docs/API_DESIGN.md): RESTful endpoint specifications, standard response and error envelopes, and parameter models across all modules.
- [**docs/DEVELOPMENT_ROADMAP.md**](file:///c:/Users/vakav/Documents/vercel/quorix/docs/DEVELOPMENT_ROADMAP.md): Phase-by-phase execution plan (Phase 0 to Phase 10), milestone dependencies, and architectural risk register.

## Local Infrastructure

Run local dependencies (PostgreSQL 16, Redis 7, Mailpit) using Docker Compose:

```bash
docker compose up -d
```
