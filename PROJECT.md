# QUORIX Platform — Engineering Architecture & Implementation Log

## Overview
QUORIX is a production-grade developer publishing and systems architecture ecosystem built with Go 1.23+ on the backend, PostgreSQL 16 (pgx + sqlc), Redis 7, Next.js 16.4.3 (App Router with Turbopack), and an Nginx reverse proxy over HTTPS.

---

## 1. Global Footer Module (`frontend/src/components/footer.tsx`)

### Architecture & Capabilities
- **Path-Aware Layout Resolution**:
  - Automatically hides inside **Author Studio** (`/studio/*`) and **Super Admin Center** (`/admin/*`).
  - Automatically presents a sleek, non-distracting **Minimal Footer** on authentication routes (`/login`, `/register`, `/forgot-password`, `/reset-password`).
  - Serves the full **Global Community Footer** across public pages (`/`, `/explore`, `/article/[slug]`, `/author/[username]`, `/topics`, `/tags`, `/search`, etc.).
- **Sticky Viewport Layout**:
  - Supported via `min-h-screen flex flex-col` on `<body>` and `flex-1` on `<main>`, ensuring the footer remains anchored to the bottom even on low-content viewports.
- **Navigation Directories**:
  - **Explore**: Community (`/authors`), Latest Articles (`/explore`), Popular Topics (`/topics`), Top Authors (`/authors`).
  - **For Authors**: Start Writing (`/studio/articles/new`), Author Guidelines (`/guidelines`), Publishing Help (`/help`), Community Rules (`/guidelines`).
  - **Resources**: About Us (`/about`), Help Center (`/help`), Contact (`/contact`), FAQs (`/faqs`).
  - **Legal**: Privacy Policy (`/legal/privacy`), Terms of Service (`/legal/terms`), Cookie Policy (`/legal/cookies`), Copyright & DMCA (`/legal/copyright`).

---

## 2. Architectural Newsletter Subscription System

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
- **Frontend State Management**:
  - Validates syntax on client before submission.
  - Displays real backend API feedback (`status = 'success' | 'error' | 'loading'`).
  - Supports 1-click toggle between Subscribe and Unsubscribe flows.

---

## 3. Article Markdown Renderer Fix

### Problem
Articles previously rendered raw markdown (`# Title`, `| Record | Purpose |`, ` ```bash `) as plain text due to an unparsed `whitespace-pre-line` wrapper.

### Resolution
- Replaced plain text container with `<MarkdownRenderer content={article.content} />` in `frontend/src/app/article/[slug]/page.tsx`.
- Powered by `react-markdown`, `remark-gfm` (GFM tables, tasklists), `rehype-highlight` (hljs syntax highlighting + copy to clipboard), and `rehype-katex`.

---

## 4. Custom Categories System

### Pre-Seeded & Managed Categories (17 Total)
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

## 5. Differentiated Dual-Layout Experience

- **Guest / Visitor Mode**: High-impact developer manifesto hero, value proposition pillars, public explore feed, and guest conversion prompt.
- **Developer Workspace Mode**: Authenticated developer command bar, live session telemetry, 3-column architecture (feeds rail, draft bar, and engineering network hub).
- **Settings Command Center**: 4 tabbed panels (`?tab=profile`, `?tab=network`, `?tab=bookmarks`, `?tab=security`) with account joined date, followers/following management with 1-click toggle, and active session termination.

---

## 6. Multi-Layout Architecture & Route Isolation

QUORIX enforces four isolated application layout paradigms:

1. **Layout 1: Public Layout**
   - Routes: `/`, `/explore`, `/article/[slug]`, `/author/[username]`, `/topics`, `/topics/[slug]`, `/search`.
   - Header: Full `Navbar` with Logo, Explore, Topics, Authors, Search, and login/register (guests) or Notification bell, Bookmarks, and Profile menu (authenticated members).
   - Footer: Full `GlobalFooter` with directories, legal links, social links, and real backend newsletter subscription engine.
   - Protected interactions (like, comment, bookmark, follow) prompt authentication with `return_to` preservation.

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


