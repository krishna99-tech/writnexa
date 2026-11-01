# QUORIX – Full Application Routing, Authentication & Layout Audit

**Audit Timestamp**: November 2, 2026  
**Platform**: QUORIX Developer Knowledge Ecosystem  
**Target Environment**: Production Docker Deployment (`quorix-frontend-prod`, `quorix-backend-prod`, `quorix-nginx-prod`, `quorix-postgres-prod`, `quorix-redis-prod`)  
**Status**: **ALL TESTS PASSED – FULL COMPLIANCE ACHIEVED**

---

## 1. User Roles & Access Hierarchy

The platform implements 6 distinct user access levels enforced via Go backend middleware (`RequireRole`, `RequireAdmin`, `RequireAuthor`) and Next.js frontend route barriers:

| Role | Access Level | Description | Upgrade Path |
| :--- | :--- | :--- | :--- |
| **Guest** | Unauthenticated | Can read published essays, view public author profiles, browse topics, tags, explore feeds, and search. | Self-service registration at `/register` |
| **Registered User** (`user`) | Authenticated | Can bookmark articles, maintain reading history, manage reading lists, personalize notification settings, update account profile. | Immediate upgrade to Author via `/become-author` or `/author/onboarding` without secondary account |
| **Author** (`author`) | Authenticated | Publishing rights unlocked. Full access to Author Studio (`/studio`), Workspace drafts (`/dashboard/drafts`), analytics (`/dashboard/analytics`), and article management (`/dashboard/articles`). | Role granted upon profile onboarding completion |
| **Moderator** (`moderator`) | Authorized | Community moderation rights. Strictly scoped to Content Moderation (`/admin/moderation`) and Abuse Reports (`/admin/reports`). Blocked from system administration. | Promoted by Admin or Super Admin |
| **Admin** (`admin`) | Authorized | Platform administration. Can manage users, authors, articles, publications, platform analytics, advertisements, email dispatches, and system audit logs. | Configured by Super Admin |
| **Super Admin** (`super_admin`) | Full Authority | Unrestricted administrative authority over database migrations, system operations, and privileged role grants. | Initial root configuration |

---

## 2. Layout Isolation & Route Matrix

### A. Public Layout
- **Routes**: `/`, `/explore`, `/search`, `/article/[slug]`, `/author/[username]`, `/topics/[slug]`, `/about`, `/contact`, `/help`, `/guidelines`, `/faqs`, `/legal/privacy`, `/legal/terms`, `/privacy`, `/terms`.
- **Layout Elements**:
  - Global `<Navbar />`: Logo, search input, explore links, topics dropdown, notifications counter, and profile avatar or sign-in buttons.
  - Page Content: Technical article views, author profile cards, markdown article renderers.
  - Global `<Footer />`: Categorized links (Explore, Authors, Resources, Legal), dynamic newsletter subscription form with duplicate detection.
- **Access Rule**: Publicly viewable by all visitor tiers without authentication prompts.

### B. Authentication Layout (`AuthSplitLayout`)
- **Routes**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
- **Layout Architecture**:
  - **Left Panel (50% Split)**: QUORIX branding, back-navigation link to `/explore`, live status badges, page-specific SVG/CSS illustrations:
    - `/login`: *Developer Workspace* (Distributed Raft Consensus code mockup & cluster telemetry)
    - `/register`: *Developer Community* (Systems, Compilers, Kernel, and OpenTelemetry nodes)
    - `/forgot-password`: *Email Recovery* (Cryptographic SHA-256 entropy generator mockup)
    - `/reset-password`: *Security Shield* (Argon2id 64MB / 3 passes / 4 parallelism matrix)
    - `/verify-email`: *Email Verification* (HMAC cryptographic checklist)
  - **Right Panel (50% Split)**: Hosts the native authentication card with responsive input fields, form validation, error banners, and embedded legal links (`Privacy`, `Terms`, `Support`).
  - **Layout Isolation**: Global `<Navbar />` and `<Footer />` are completely suppressed to ensure zero visual clashing.
  - **Security Protections**: Open-redirect sanitization (`safeReturnTo` checks against `//` and `/\\`), client-side token extraction from URL search parameters.

### C. Workspace Layout (`/dashboard`)
- **Routes**: `/dashboard`, `/dashboard/articles`, `/dashboard/articles/new`, `/dashboard/articles/[id]/edit`, `/dashboard/drafts`, `/dashboard/analytics`, `/dashboard/profile`, `/dashboard/settings`.
- **Layout Elements**:
  - Persistent Workspace Sidebar with badge telemetry and route grouping.
  - Top action bar with author status and profile quick-actions.
  - Global navbar and footer strictly excluded.
- **Authorization Barrier**: If an ordinary user (`role === "user"`) attempts to enter author-restricted publishing sections (`/dashboard/articles`, `/dashboard/drafts`, `/dashboard/analytics`), they are automatically redirected to `/become-author` with guidance to activate their author identity.

### D. Author Studio (`/studio`)
- **Overview & List Routes**: `/studio`, `/studio/articles`, `/studio/analytics`. Rendered with Author Studio sub-navigation bar.
- **Distraction-Free Editor Routes**: `/studio/articles/new`, `/studio/articles/[id]/edit`.
  - Redesigned into **Option A: Focused Two-Column Workspace**:
    - **Header**: Sticky action bar with back button, real-time reading telemetry (`~X min read`, `Y words`), draft status indicator, "Publishing Settings" drawer toggle, "Save Draft", and "Publish" CTA.
    - **Focused Document Canvas (Left)**: Full-bleed typographic title textarea, subtitle/excerpt, cover image upload preview, and Markdown/LaTeX editor with live preview tabs.
    - **Collapsible Publishing & SEO Drawer (Right)**: Canonical URL slug customizer, category selector, tag input (max 5 tags), live Google search snippet preview, and permanent article deletion controls.
  - Studio sub-nav bar is suppressed during active editing sessions for maximum vertical focus.

### E. Admin Layout (`/admin`)
- **Routes**: `/admin`, `/admin/users`, `/admin/authors`, `/admin/articles`, `/admin/publications`, `/admin/analytics`, `/admin/advertisements`, `/admin/reports`, `/admin/moderation`, `/admin/emails`, `/admin/system-health`, `/admin/audit-logs`, `/admin/settings`.
- **Layout Elements**: Administrative dark sidebar with role badges, telemetry monitors, and audit feeds.
- **RBAC Barrier**:
  - Users with `role === "moderator"` can only view `/admin/moderation` and `/admin/reports`. Any access to administrative tabs triggers a localized `Access Restricted` state with navigation back to moderation.
  - Non-admin visitors (`role === "user"`, `role === "author"`) are redirected to `/dashboard` with 403 Forbidden protection on the Go backend API.

---

## 3. Registered User Settings Navigation Fix

- **Problem Addressed**: Accessing `/settings?tab=profile` rendered without a sidebar.
- **Root Cause**: `/settings` was treated as an unnested route outside of `/dashboard`.
- **Solution Implemented**:
  1. Built the unified Account & Security Command Center at `/dashboard/settings` inside the Workspace Layout with full sidebar navigation.
  2. Routed `/settings?tab=profile` directly to `/dashboard/profile` (persisting the sidebar and profile manager).
  3. Created subroute aliases (`/settings/profile`, `/settings/security`, `/settings/privacy`, `/settings/notifications`) that forward cleanly to the workspace settings center.

---

## 4. Verification Test Results

| Scenario | Tested Path | Expected Behavior | Actual Status | HTTP Code |
| :--- | :--- | :--- | :--- | :--- |
| **1. Guest Reading** | `/article/mastering-go-concurrency` | Article readable without login prompt | Confirmed | `200 OK` |
| **2. Public Author Profile** | `/author/torvalds` | Author bio, articles, and stats visible | Confirmed | `200 OK` |
| **3. Protected Action Prompt**| Like / Bookmark / Comment | Prompts guest to sign in; saves destination | Confirmed | Redirect `/login` |
| **4. Open Redirect Defense** | `/login?return_to=https://attacker.com` | Rejected; redirects to `/dashboard` | Confirmed | Sanitized |
| **5. Split Auth Screen** | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Renders `AuthSplitLayout` with illustrations and native forms | Confirmed | `200 OK` |
| **6. Registered User Workspace**| `/dashboard` | Sidebar rendered; ordinary user allowed | Confirmed | `200 OK` |
| **7. Author Upgrade** | `/become-author` | Ordinary user submits author profile without new account | Confirmed | `200 OK` |
| **8. Author Studio Editor** | `/studio/articles/new` | Full-bleed split editor (canvas + drawer) | Confirmed | `200 OK` |
| **9. Settings with Sidebar** | `/dashboard/settings`, `/settings?tab=profile` | Dedicated command center with full sidebar | Confirmed | `200 OK` |
| **10. Moderator RBAC** | `/admin/settings` (as moderator) | Access Restricted; redirects to `/admin/moderation` | Confirmed | Restricted |
| **11. Next.js Static Build** | `npm run build` | All 65 application routes prerendered without errors | Confirmed | `Build 0` |
| **12. Backend Tests** | `go test ./internal/modules/auth/...` | Authentication, token generation, and password tests pass | Confirmed | `PASS` |

