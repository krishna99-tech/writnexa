# WRITNEXA – Full Application Routing, Authentication & Layout Audit

**Audit Timestamp**: November 2, 2026  
**Platform**: WRITNEXA Developer Knowledge Ecosystem (`writnexa.dev`)  
**Target Environment**: Production Docker Deployment (`quorix-frontend-prod`, `quorix-backend-prod`, `quorix-nginx-prod`, `quorix-postgres-prod`, `quorix-redis-prod`)  
**Status**: **ALL TESTS PASSED – FULL COMPLIANCE ACHIEVED**

---

## 1. User Roles & Access Hierarchy

The platform implements 6 distinct user access levels enforced via Go backend middleware (`RequireRole`, `RequireAdmin`, `RequireAuthor`) and Next.js frontend route barriers:

| Role | Access Level | Description | Upgrade Path |
| :--- | :--- | :--- | :--- |
| **Guest** | Unauthenticated | Can read published essays, view public author profiles, browse topics, tags, explore feeds, and search. | Self-service registration at `/register` |
| **Registered User** (`user`) | Authenticated | Can bookmark articles, export bookmarks to Markdown, maintain reading history, personalize notification settings, update account profile. | Immediate upgrade to Author via `/become-author` or `/author/onboarding` without secondary account |
| **Author** (`author`) | Authenticated | Publishing rights unlocked. Full access to Author Studio (`/studio`), Zen Writer canvas, Workspace drafts (`/dashboard/drafts`), analytics (`/dashboard/analytics`), and article series management. | Role granted upon profile onboarding completion |
| **Moderator** (`moderator`) | Authorized | Community moderation rights. Strictly scoped to Content Moderation (`/admin/moderation`) and Abuse Reports (`/admin/reports`). Blocked from system administration. | Promoted by Admin or Super Admin |
| **Admin** (`admin`) | Authorized | Platform administration. Can manage users, authors, articles, publications, platform analytics, advertisements, email dispatches, and system audit logs. | Configured by Super Admin |
| **Super Admin** (`super_admin`) | Full Authority | Unrestricted administrative authority over database migrations, system operations, and privileged role grants. | Initial root configuration |

---

## 2. Layout Isolation & Route Matrix

### A. Public Layout
- **Routes**: `/`, `/explore`, `/search`, `/article/[slug]`, `/author/[username]`, `/topics/[slug]`, `/about`, `/contact`, `/help`, `/guidelines`, `/faqs`, `/legal/privacy`, `/legal/terms`, `/privacy`, `/terms`.
- **Layout Elements**:
  - Global `<Navbar />`: Logo, search input, explore links, topics dropdown, notifications counter, and profile avatar or sign-in buttons.
  - Page Content: Technical article views, author profile cards, markdown article renderers, dynamic Table of Contents, Zen Reader Mode button, and series progression navigation.
  - Global `<Footer />`: Categorized links (Explore, Authors, Resources, Legal) and dynamic newsletter subscription form.
- **Session-Aware Footer Rule**:
  - **Unauthenticated Visitors**: Footer is displayed normally.
  - **Authenticated Users / Authors (`user !== null`)**: The footer is **completely suppressed** across the application to prevent bottom clutter and deliver an uninterrupted, modern app workspace.

### B. Authentication Layout (`AuthSplitLayout`)
- **Routes**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
- **Layout Architecture**:
  - **Left Panel (50% Split)**: WRITNEXA branding, back-navigation link to `/explore`, live status badges, page-specific SVG/CSS illustrations:
    - `/login`: *Developer Workspace* (Distributed Raft Consensus code mockup & cluster telemetry)
    - `/register`: *Developer Community* (Systems, Compilers, Kernel, and OpenTelemetry nodes)
    - `/forgot-password`: *Email Recovery* (Cryptographic SHA-256 entropy generator mockup)
    - `/reset-password`: *Security Shield* (Argon2id 64MB / 3 passes / 4 parallelism matrix)
    - `/verify-email`: *Email Verification* (HMAC cryptographic checklist)
  - **Right Panel (50% Split)**: Hosts the native authentication card with responsive input fields, form validation, error banners, and embedded legal links (`Privacy`, `Terms`, `Support`).
  - **Interactive Button Loading States**:
    - Primary submission buttons utilize `<Button isLoading={loading} loadingText="...">` with an animated `<Loader2 className="animate-spin" />` icon to eliminate double submissions during network latency.
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
  - **Header**: Sticky action bar with back button, real-time reading telemetry (`~X min read`, `Y words`), draft status indicator, Zen Writer trigger, "Publishing Settings" drawer toggle, "Save Draft", and "Publish" CTA.
  - **Focused Document Canvas (Left)**: Full-bleed typographic title textarea, subtitle/excerpt, cover image upload preview, and Markdown/LaTeX editor with live preview tabs.
  - **Collapsible Publishing & SEO Drawer (Right)**: Canonical URL slug customizer, category selector, tag input (max 5 tags), live Google search snippet preview, and permanent article deletion controls.
  - **Zen Writer Mode**: Fullscreen distraction-free authoring canvas for deep coding and writing sessions.
  - Studio sub-nav bar is suppressed during active editing sessions for maximum vertical focus.

### E. Admin Layout (`/admin`)
- **Routes**: `/admin`, `/admin/users`, `/admin/authors`, `/admin/articles`, `/admin/publications`, `/admin/analytics`, `/admin/advertisements`, `/admin/reports`, `/admin/moderation`, `/admin/emails`, `/admin/system-health`, `/admin/audit-logs`, `/admin/settings`.
- **Layout Elements**: Administrative dark sidebar with role badges, telemetry monitors, and audit feeds.
- **RBAC Barrier**:
  - Users with `role === "moderator"` can only view `/admin/moderation` and `/admin/reports`. Any access to administrative tabs triggers a localized `Access Restricted` state with navigation back to moderation.
  - Non-admin visitors (`role === "user"`, `role === "author"`) are redirected to `/dashboard` with 403 Forbidden protection on the Go backend API.

---

## 3. High-Utility Reading & Knowledge Hub Verification

### 3.1 Dynamic Table of Contents (ToC)
- Automatically parses H2 and H3 headings from article markdown.
- Renders sticky right-rail sidebar navigation with auto-scrolling anchor links.
- Uses `IntersectionObserver` scroll-spy to highlight current reading position with zero layout shift.

### 3.2 IEEE / ACM Academic PDF Export
- Dedicated `@media print` styling in `globals.css`.
- Strips navigation bars, headers, footers, and floating controls.
- Renders high-contrast serif typography with clean page-break boundaries on code blocks, tables, and quotes.

### 3.3 Advanced Bookmark Knowledge Hub (`/library/bookmarks`)
- Real-time search by title, excerpt, and tags.
- Categorized collection filtering tabs (*"Databases"*, *"Go & Systems"*, *"Linux & eBPF"*, *"DevOps"*).
- Reading statistics indicator showing total saved articles and cumulative reading duration.
- **One-Click Markdown Export**: Downloads full markdown catalog with active hyperlinks.

### 3.4 In-Article Author Newsletter Subscription Box
- Seamless dispatch box embedded after technical whitepapers.
- Direct integration with `/api/v1/newsletter/subscribe` supporting duplicate handling and instant UI feedback.

### 3.5 Global Route Progress Indicator
- Animated top-of-viewport progress bar (`route-progress-bar.tsx`) active during Next.js App Router client-side transitions.

---

## 4. Verification Test Results

| Scenario | Tested Path | Expected Behavior | Actual Status | HTTP Code |
| :--- | :--- | :--- | :--- | :--- |
| **1. Guest Reading** | `/article/mastering-go-concurrency` | Article readable without login prompt; footer visible | Confirmed | `200 OK` |
| **2. Logged-in Session Footer** | `/`, `/explore`, `/article/...` (Logged in) | Global footer completely hidden for authenticated user | Confirmed | Clean DOM |
| **3. Zen Reader Mode** | `/article/[slug]` (Hotkey `Z`) | Fullscreen reader canvas opens; font/width controls active | Confirmed | `200 OK` |
| **4. Article Series Header & Footer** | `/article/[slug]` (Series member) | Parts dropdown & linear next/prev navigation rendered | Confirmed | `200 OK` |
| **5. Table of Contents Scroll-Spy** | `/article/[slug]` | Headings dynamically parsed; active heading highlighted | Confirmed | `200 OK` |
| **6. Academic PDF Print Export** | `/article/[slug]` (PDF Export) | Window print dialog triggers with clean IEEE paper layout | Confirmed | Print Stream |
| **7. Bookmark Search & MD Export** | `/library/bookmarks` | Instant search filtering + `.md` file download | Confirmed | `200 OK` |
| **8. Author Newsletter Box** | `/article/[slug]` | Subscribes email via `/api/v1/newsletter/subscribe` | Confirmed | `200 OK` |
| **9. Button Loading Animation** | `/login`, `/register`, `/forgot-password` | Button disables & spins during pending API request | Confirmed | UI Feedback |
| **10. Route Navigation Progress** | Path change (e.g., `/explore` -> `/topics`) | Top glowing accent bar animates smoothly | Confirmed | Smooth Transit |
| **11. Open Redirect Defense** | `/login?return_to=https://attacker.com` | Rejected; redirects safely to `/dashboard` | Confirmed | Sanitized |
| **12. Split Auth Screen** | `/login`, `/register`, `/forgot-password`, `/reset-password` | Renders `AuthSplitLayout` with illustrations and native forms | Confirmed | `200 OK` |
| **13. Author Studio Editor** | `/studio/articles/new` | Full-bleed split editor (canvas + drawer + Zen Writer) | Confirmed | `200 OK` |
| **14. NGINX Ingress Routing** | `https://writnexa.dev` | TLS terminated, static chunks cached 365d, rate-limited | Confirmed | `200 OK` |
| **15. Backend Test Suite** | `go test ./...` | Series, auth, article, and subscription handlers pass | Confirmed | `PASS` |
