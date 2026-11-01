# QUORIX Administrator Access & Authentication Guide

This guide provides the necessary authentication credentials, access instructions, and role permissions for platform administrators and operators.

---

## 1. Default Super Administrator Credentials

Upon initial deployment and database seeding, a default **Super Administrator** account is provisioned:

| Attribute | Value |
|---|---|
| **Email** | `admin@quorix.io` |
| **Password** | `QuorixAdmin2026!` |
| **Username** | `admin` |
| **Role** | `super_admin` |
| **Account Status** | `active` |
| **Email Verification** | Verified |

---

## 2. Browser Sign-In Procedure

1. **Navigate to the Login Page**:
   - Open your browser and navigate to:
     ```
     https://localhost/login
     ```
   *(Note: Plain HTTP requests to `http://localhost/login` are automatically redirected to secure HTTPS on port 443).*

2. **Self-Signed Certificate Bypass (Local Development)**:
   - When connecting locally via `localhost`, your browser may display a warning (*"Your connection is not private"* or *"Potential Security Risk Ahead"*).
   - Click **Advanced** (or **More Details**) and select **Proceed to localhost (unsafe)** or **Accept the Risk and Continue**.

3. **Enter Credentials**:
   - **Email**: `admin@quorix.io`
   - **Password**: `QuorixAdmin2026!`
   - Click **Sign In**.

4. **Session Persistence**:
   - The backend dispatches a short-lived access JWT (`15 minutes`) and sets a secure, HTTP-only refresh cookie (`SameSite=Lax`, `Secure`, `7 days`) that automatically refreshes your session.

---

## 3. Super Admin Center Routes

Once authenticated with the `super_admin` role, you have full access to all protected administrative dashboards:

| Route | Purpose | Permissions |
|---|---|---|
| [`/admin`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/page.tsx) | Executive KPI dashboard (user growth, article stats, engagement metrics) | `admin`, `super_admin` |
| [`/admin/users`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/users/page.tsx) | User management, profile inspections, suspensions, and RBAC role elevation | `super_admin` only for role edits |
| [`/admin/moderation`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/moderation/page.tsx) | Moderation queue for flagged comments, reported articles, and policy violations | `moderator`, `admin`, `super_admin` |
| [`/admin/articles`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/articles/page.tsx) | Content lifecycle management, featuring/unfeaturing articles, and archival | `admin`, `super_admin` |
| [`/admin/analytics`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/analytics/page.tsx) | Platform-wide analytics, traffic referrers, unique visitors, and read duration | `admin`, `super_admin` |
| [`/admin/ads`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/ads/page.tsx) | Modular ad placement configuration, frequency capping, and CTR telemetry | `admin`, `super_admin` |
| [`/admin/operations`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/operations/page.tsx) | Real-time system health, database pool telemetry, worker queues, and job retries | `admin`, `super_admin` |
| [`/admin/audit-logs`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/audit-logs/page.tsx) | Immutable administrative audit trail for compliance and tracking mutations | `admin`, `super_admin` |
| [`/admin/settings`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/admin/settings/page.tsx) | Platform-wide operational flags, registration toggles, and cache invalidation | `super_admin` |
| [`/studio`](file:///c:/Users/vakav/Documents/vercel/quorix/frontend/src/app/studio/page.tsx) | Author Studio for writing, editing, and publishing technical markdown essays | `author`, `admin`, `super_admin` |

---

## 4. Demo Author Accounts

The seed script also provisions demonstration author accounts for testing writing and community features:

| Display Name | Username | Email | Password | Role |
|---|---|---|---|---|
| **Alex Morgan** | `alexmorgan` | `alex.morgan@quorix.io` | `QuorixPass2026!` | `author` |
| **Elena Rostova** | `elenarostova` | `elena.rostova@quorix.io` | `QuorixPass2026!` | `author` |
| **Marcus Vance** | `marcusvance` | `marcus.vance@quorix.io` | `QuorixPass2026!` | `author` |

---

## 5. Security & Password Rotation

> [!IMPORTANT]
> In production environments exposed to the public internet, change the default password immediately after the first login:

1. **Via UI**: Navigate to `/settings` and update your password.
2. **Via Database CLI**:
   ```bash
   docker exec -it quorix-postgres-prod psql -U quorix_admin -d quorix_prod
   ```
   Execute an update with a newly generated Argon2id password hash.
