# WRITNEXA (`writnexa.dev`)

> **The Next-Generation Technical Publishing Ecosystem & Engineering Journal**

**WRITNEXA** is a production-grade developer publication and technical knowledge platform engineered specifically for software engineers, systems architects, DevOps specialists, and open-source contributors. Built to replace conventional, cluttered blogging platforms, WRITNEXA combines the rigor of an academic engineering journal with an ultra-fast, minimalist developer reading and writing experience.

---

## 🏛️ Core Architectural Pillars

WRITNEXA is structured around three foundational pillars:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WRITNEXA ECOSYSTEM                              │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. Public Explorer │ 2. Zen Reading Hub │ 3. Author Studio & Economy   │
│ • Domain Taxonomy  │ • Zen Mode Sanctum │ • Distraction-Free Writer    │
│ • Author Directory │ • Dynamic TOC      │ • Multi-Part Series Creator  │
│ • RSS & Atom Feeds │ • Whitepaper PDF   │ • Sponsorships & Payouts     │
│ • Reading Lists    │ • Peer Review Trust│ • Live Reader Telemetry      │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### 1. The Technical Explorer
* **Engineering Domain Taxonomy**: Curated engineering categories covering Distributed Systems, Linux Kernel & eBPF, Databases & Storage, Go & Concurrency, Compilers, GPU Acceleration, Cloud Infrastructure, and Quantitative Finance.
* **Verified Technical Authors**: Discover software engineers, infrastructure architects, and core maintainers ranked by technical contributions and peer endorsements.
* **Syndication & Feeds**: Platform-wide and topic-specific RSS 2.0 and Atom feeds (`/feed.xml`, `/rss.xml`) for RSS readers and developer aggregators.
* **Curated Reading Lists & Collections**: Organize saved publications into study collections (*"Distributed Systems Prep"*, *"Databases & Storage"*, *"Read Later"*) with exportable Markdown study packs.

### 2. The Zen Reading Sanctum
* **One-Click Distraction-Free Reading (Hotkey `Z`)**: Instantly strips away navigation bars, menus, and sidebars, presenting a clean reading canvas.
* **In-Reader Typography Customizer**: Real-time switching between Modern Sans (*Inter/Geist*), Elegant Serif (*Merriweather*), and Monospace (*JetBrains Mono*), with adjustable font sizes, column widths, and reading focus rulers.
* **Interactive Table of Contents**: Automatically parses `H2` and `H3` sections with live `IntersectionObserver` scroll-spying and smooth anchor jumping.
* **One-Click Academic Whitepaper PDF Export**: Formats any technical publication into an IEEE/ACM-style printable paper, stripping web chrome and optimizing typography and code blocks for printing and archival.
* **Multi-Part Engineering Series & Volumes**: Sequential chapter roadmaps (*"Part 1 of 4"*) with progress bars, reading times, and previous/next navigation cards.
* **Architecture Guild Peer Review**: Verified trust badges for articles that have undergone code benchmark verification, architectural review, and security audits.

### 3. Author Studio & Creator Economy
* **Studio Distraction-Free Zen Writer**: Fullscreen writing environment with live word counters, character meters, reading-time estimations, typewriter focus, and side-by-side Markdown previews.
* **Creator Sponsorships & Monetization**: Readers can back technical authors through tiered sponsorships ($5, $15, $50, or custom amounts) with real-time balance tracking, earnings telemetry, and transfer ledgers.
* **Real-Time Reader Telemetry**: Live heartbeat synchronization showing active engineers reading an article concurrently (`● N engineers reading now`).
* **Architectural Dispatches Newsletter**: Integrated technical dispatch subscription engine for author updates and engineering deep dives.

---

## 🛠️ Technology Stack & Infrastructure

WRITNEXA is engineered as a modern, high-throughput web application:

* **Frontend Layer**:
  * **Framework**: Next.js 16 App Router (Turbopack, React 19)
  * **Styling**: Tailwind CSS with custom WCAG AAA high-contrast light and dark mode palettes
  * **Icons & UI Primitives**: Lucide Icons, Radix UI primitives
  * **Markdown Processing**: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex` (KaTeX LaTeX formulas), and `rehype-highlight` (syntax-highlighted code blocks)
  * **Navigation**: Hardware-accelerated glowing route progress bar for seamless page transitions

* **Backend Layer**:
  * **Engine**: Go 1.23+ Gin Modular Monolith Microservice
  * **Database**: PostgreSQL 16 with normalized schemas, GIN full-text search indexing, and Goose database migrations
  * **Caching & Ephemeral State**: Redis 7 for live reader telemetry heartbeats and session caching
  * **Security**: Argon2id password hashing, HTTP-only secure cookie JWT sessions, and CSRF protection
  * **Edge & Proxy**: NGINX reverse proxy with TLS/SSL termination, HTTP/2, and strict security headers

---

## 📁 Repository Organization

```
quorix/
├── backend/                  # Go Gin Modular Monolith Microservice
│   ├── cmd/api/              # HTTP API entrypoint & graceful lifecycle handling
│   ├── internal/modules/     # Domain modules: content, auth, community, studio, admin
│   ├── migrations/           # Versioned Goose SQL schema migrations
│   └── Dockerfile            # Multi-stage production container build
├── frontend/                 # Next.js 16 App Router Frontend
│   ├── src/app/              # Next.js routes, server components, and API endpoints
│   ├── src/components/       # Reusable React components (Zen Mode, TOC, Logos, Cards)
│   ├── src/lib/              # Strongly typed API clients, theme & auth providers
│   └── Dockerfile            # Multi-stage standalone Next.js container build
├── docs/                     # Specifications, database ERDs, and API contracts
└── docker-compose.prod.yml   # Production orchestration (Frontend, Backend, Postgres, Redis, Nginx)
```

---


---

## 📚 Documentation & Architecture Specifications

Detailed technical specifications, operational runbooks, and design contracts are maintained in /docs:
- [Comprehensive System Architecture](file:///docs/ARCHITECTURE.md)
- [Production Docker & NGINX Architecture Guide](file:///docs/deployment/docker_and_nginx_guide.md)
- [Production Deployment Guide](file:///docs/deployment/production_deployment_guide.md)
- [Master Project Specification](file:///PROJECT.md)
- [Routing, Authentication & Layout Audit](file:///ROUTE_AUTH_AUDIT.md)
- [Database Relational Schema](file:///docs/DATABASE_RELATIONSHIPS.md)
- [REST API Contracts & Endpoints](file:///docs/API_DESIGN.md)

## 📄 License & Attribution

Designed and maintained for the **WRITNEXA** developer ecosystem (`writnexa.dev`). Built with performance, accessibility, and technical depth at its core.
