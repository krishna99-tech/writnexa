# WRITNEXA Platform — Engineering Architecture & Implementation Log

## Overview

**WRITNEXA** (`writnexa.dev`) is an enterprise-grade developer publishing platform, technical blogging ecosystem, and systems architecture hub. Built with Go 1.24+ on the backend, PostgreSQL 16 (pgx + sqlc), Redis 7, Next.js 16.4.3 (App Router with Turbopack), and an NGINX 1.27 Alpine SSL reverse proxy with dual-tier rate limiting.

---

## 1. Session-Aware Global Footer Module (`frontend/src/components/footer.tsx`)

### Architecture & Capabilities

- **Session-Aware Suppression**:
  - Automatically checks `useAuth()`. Whenever an authenticated reader, author, or administrator is logged in (`user !== null`), the footer is completely hidden across the entire application.
  - This eliminates bottom clutter, maximizes vertical reading real estate, and delivers a modern, app-like experience for signed-in developers.
- **Path-Aware Layout Resolution**:
  - When logged out, automatically hides inside **Author Studio** (`/studio/*`) and **Super Admin Center** (`/admin/*`).
  - Automatically presents a sleek, non-distracting **Minimal Footer** on authentication routes (`/login`, `/register`, `/forgot-password`, `/reset-password`).
  - Serves the full **Global Community Footer** exclusively to unauthenticated visitors across public exploratory pages (`/`, `/explore`, `/article/[slug]`, `/author/[username]`, `/topics`, `/tags`, `/search`).
- **Sticky Viewport Layout**:
  - Supported via `min-h-screen flex flex-col` on `<body>` and `flex-1` on `<main>`, ensuring the footer remains anchored to the bottom even on low-content viewports.
- **Navigation Directories**:
  - **Explore**: Community (`/authors`), Latest Articles (`/explore`), Popular Topics (`/topics`), Top Authors (`/authors`).
  - **For Authors**: Start Writing (`/studio/articles/new`), Author Guidelines (`/guidelines`), Publishing Help (`/help`), Community Rules (`/guidelines`).
  - **Resources**: About Us (`/about`), Help Center (`/help`), Contact (`/contact`), FAQs (`/faqs`).
  - **Legal**: Privacy Policy (`/legal/privacy`), Terms of Service (`/legal/terms`), Cookie Policy (`/legal/cookies`), Copyright & DMCA (`/legal/copyright`).

---

## 2. Interactive Zen Reading Suite & Multi-Part Series

### 2.1 Zen Reading Mode (`frontend/src/components/zen-reader-mode.tsx`)
- **Distraction-Free Canvas**: Fullscreen modal overlay activated via toolbar button or keyboard shortcut (`Z`).
- **Typography Controls**:
  - Font switching: Sans-Serif (`Inter`), Serif (`Merriweather` / `Georgia`), Monospace (`JetBrains Mono`).
  - Font sizing: 5 adjustable scale levels (Small to Extra-Large).
  - Column width controls: Narrow (680px), Medium (780px), or Wide (920px) reading columns.
- **Real-Time Reading Progress**: Live scroll percentage bar fixed at the top of the viewport.

### 2.2 Article Series & Multi-Part Whitepapers
- **Database Schema** (`backend/migrations/00013_article_series_and_whitepapers.sql`):
  - `article_series`: Tracks series title, description, cover image, and author.
  - `article_series_items`: Junction table mapping articles to series with ordering indices (`series_order`).
- **Backend API**:
  - `GET /api/v1/articles/:slug/series`: Returns series metadata, total parts, current part number, and ordered sibling articles.
- **Frontend Navigation Components**:
  - `ArticleSeriesHeader`: Displays series badge, total parts count, and interactive parts dropdown list.
  - `ArticleSeriesFooter`: Provides linear "Previous Part" and "Next Part" cards at the bottom of the article.

### 2.3 Studio Zen Writer (`frontend/src/components/studio-zen-writer.tsx`)
- Fullscreen distraction-free authoring canvas for engineers.
- Real-time word counter and read-time meter.
- Hotkey escape (`Esc`) and instant synchronization with the main editor state.

---

## 3. High-Utility Publishing Suite

### 3.1 Dynamic Table of Contents (`frontend/src/components/table-of-contents.tsx`)
- Parses Markdown AST dynamically to extract H2 and H3 headings.
- Assigns auto-generated, URL-safe anchor slugs.
- Uses `IntersectionObserver` scroll-spy to highlight the currently active section as the reader scrolls.
- Smooth scroll navigation with `scroll-mt-20` offset to account for sticky navigation headers.

### 3.2 IEEE / ACM Academic PDF & Print Export (`frontend/src/components/article-pdf-export.tsx`)
- One-click PDF generation via native browser print engine.
- Dedicated `@media print` CSS rules in `frontend/src/app/globals.css`:
  - Suppresses all navigation bars, sidebars, buttons, and footers.
  - Formats content into high-contrast black-and-white typography.
  - Enforces page-break rules (`break-inside: avoid` on code blocks, tables, and blockquotes).
  - Embeds article canonical URL, publication date, and author attribution for offline archiving.

### 3.3 Advanced Bookmark Knowledge Hub (`frontend/src/app/library/bookmarks/page.tsx`)
- Real-time client-side search across bookmarked article titles, excerpts, and tags.
- Topic collection filter pills (*"All"*, *"Databases"*, *"Go & Systems"*, *"Linux & eBPF"*, *"DevOps"*).
- Reading statistics meter displaying total saved articles and cumulative reading duration.
- **One-Click Markdown Export (`.md`)**: Generates and downloads a clean Markdown digest of all bookmarked articles with direct hyperlinks.

### 3.4 In-Article Author Newsletter Box (`frontend/src/components/author-newsletter-box.tsx`)
- Embedded newsletter subscription box placed at the conclusion of technical whitepapers.
- Allows readers to subscribe directly to author dispatches without leaving the reading flow.
- Wired directly to the backend subscription service (`/api/v1/newsletter/subscribe`).

---

## 4. Universal Button Loading & Navigation Route Progress

### 4.1 Button Loading State (`frontend/src/components/ui/button.tsx`)
- Built-in `isLoading?: boolean` and `loadingText?: string` props.
- Automatically disables the button and renders a spinning `<Loader2 className="animate-spin" />` icon during in-flight API requests.
- Integrated across `/login`, `/register`, `/forgot-password`, `/reset-password`, and article publication actions to prevent duplicate form submissions.

### 4.2 Top-of-Page Navigation Progress Bar (`frontend/src/components/route-progress-bar.tsx`)
- Listens to Next.js App Router pathname and search parameter changes.
- Displays an animated glowing accent bar along the top edge of the viewport during route transitions.

---

## 5. Architectural Newsletter Subscription System

### Database Architecture (`backend/migrations/00011_newsletter_subscriptions.sql`)

```sql
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    source VARCHAR(100) NOT NULL DEFAULT 'global_footer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `POST /api/v1/newsletter/subscribe`:
  - Validates RFC-compliant email address.
  - Idempotent: Handles existing subscribers gracefully (`ALREADY_SUBSCRIBED`).
  - Reactivates previously unsubscribed email addresses.
- `POST /api/v1/newsletter/unsubscribe`:
  - Sets subscriber status to `unsubscribed` with instant confirmation.

---

## 6. Article Markdown & LaTeX Engine

- Powered by `react-markdown`, `remark-gfm` (GFM tables, tasklists, autolinks), `rehype-highlight` (hljs syntax highlighting + copy to clipboard button), and `rehype-katex` (mathematical formulas).
- `<MarkdownRenderer content={article.content} />` in `frontend/src/app/article/[slug]/page.tsx` ensures proper typography, table borders, and code block styling.

---

## 7. Managed Categories (17 Specialized Engineering Domains)

1. Go & Systems (`go-systems`)
2. Distributed Systems (`distributed-systems`)
3. Database Architecture (`databases`)
4. Frontend & Next.js (`frontend`)
5. DevOps & Cloud (`devops`)
6. Security & Cryptography (`security`)
7. Linux & eBPF (`linux-kernel`)
8. SRE & Observability (`cloud-sre`)
9. AI & Distributed ML (`ai-infra`)
10. Networking (`networking`)
11. Artificial Intelligence (`ai`)
12. Technology & Compilers (`tech`)
13. GitHub & Open Source (`github`)
14. Stocks & Quantitative Finance (`stocks`)
15. Cloud Infrastructure (`clouds`)
16. Developer Platforms (`platforms`)
17. GPUs & Accelerator Hardware (`gpus`)

---

## 8. Multi-Layout Architecture & Route Isolation

WRITNEXA enforces four isolated application layout paradigms:

1. **Layout 1: Public Layout**
   - Routes: `/`, `/explore`, `/article/[slug]`, `/author/[username]`, `/topics`, `/topics/[slug]`, `/search`.
   - Header: Full `Navbar` with Logo, Explore, Topics, Authors, Search, and login/register (guests) or Notification bell, Bookmarks, and Profile menu (authenticated members).
   - Footer: Full `GlobalFooter` (rendered only when visitor is logged out; automatically suppressed when authenticated).
2. **Layout 2: Authentication Layout**
   - Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
   - Header: `MinimalAuthNavbar` (logo + link back to explore).
   - Footer: `MinimalFooter` (minimal copyright + essential legal links).
   - Destination preservation: Redirects users back to `return_to` upon successful sign-in, or routes administrators to `/admin` and regular users to `/dashboard`.
3. **Layout 3: Author Workspace Layout**
   - Routes: `/dashboard`, `/dashboard/articles`, `/dashboard/analytics`, `/dashboard/profile`, `/dashboard/settings`.
   - Dedicated Sidebar Navigation: Overview, Articles & Drafts, Content Analytics, Author Profile, Account & Security Settings.
   - Isolation: **Strictly suppresses both the public navbar and the public footer**.
4. **Layout 4: Admin Center Layout**
   - Routes: `/admin`, `/admin/users`, `/admin/articles`, `/admin/advertisements` (`/admin/ads`), `/admin/operations`, `/admin/analytics`, `/admin/settings`.
   - Dedicated Administrative Sidebar with RBAC checks (`RequireRole("admin")` on frontend and backend).
   - Isolation: **Strictly suppresses both the public navbar and the public footer**.

---

## 9. Containerization & Edge Routing Architecture

- **Domain**: `writnexa.dev` and `www.writnexa.dev`.
- **NGINX 1.27 Alpine Reverse Proxy**:
  - TLS 1.2 / 1.3 termination with modern cipher suites and HSTS (`max-age=63072000; includeSubDomains; preload`).
  - Dual-tier DDoS rate limiting: `auth_limit` (5r/s burst 10) on `/api/v1/auth/*` and `api_general` (30r/s burst 50) on `/api/*`.
  - Immutable caching (`Cache-Control: public, max-age=31536000, immutable`) for `/_next/static/*`.
  - WebSocket upgrade support for real-time telemetry and hot reloading.
- **Multi-Stage Container Builds**:
  - Backend: Go 1.24 static compilation (`CGO_ENABLED=0`, `-ldflags="-w -s"`), unprivileged execution as `appuser:10001` on Alpine 3.20 (~25MB image size).
  - Frontend: Next.js standalone runner on Node 22 Alpine, unprivileged execution as `nextjs:1001` (~120MB image size).
- Complete documentation: [Docker & NGINX Guide](file:///docs/deployment/docker_and_nginx_guide.md).
