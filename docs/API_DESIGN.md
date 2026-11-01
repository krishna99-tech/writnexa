# QUORIX — RESTful API Design & Interface Specifications

All endpoints are versioned under `/api/v1`.

---

## 1. Global API Conventions

### 1.1 Standard JSON Response Envelopes

Every JSON payload returned by QUORIX conforms to a predictable, strictly typed envelope.

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_records": 142,
    "total_pages": 8
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested article was not found or is currently in draft.",
    "details": [
      {
        "field": "slug",
        "issue": "no published article matching 'go-concurrency-patterns'"
      }
    ]
  }
}
```

### 1.2 Standard HTTP Status Codes

| Code | Meaning | Use Case |
|---|---|---|
| `200 OK` | Success | Successful GET, PATCH, PUT, or idempotent state change |
| `201 Created` | Created | Resource successfully created (Article, Comment, User) |
| `204 No Content` | No Content | Successful DELETE or action returning empty payload |
| `400 Bad Request` | Malformed Request | Invalid JSON syntax, missing body |
| `401 Unauthorized` | Unauthenticated | Missing or expired JWT access token |
| `403 Forbidden` | Access Denied | Authenticated user lacks necessary role/ownership |
| `404 Not Found` | Not Found | Resource does not exist or has been soft-deleted |
| `409 Conflict` | Conflict | Duplicate unique field (e.g. email, username, slug) |
| `422 Unprocessable` | Validation Error | Field validation failure (e.g. invalid email format) |
| `429 Too Many Req` | Rate Limited | Exceeded per-minute request rate limit |
| `500 Internal Error`| Server Error | Unexpected panic or uncaught database exception |

---

## 2. Core API Endpoint Catalog

### 2.1 System & Health Checks
- `GET /api/v1/health`
  - Returns `200 OK` with status `ok` (or `degraded` if sub-services are down), uptime, version.
- `GET /api/v1/health/ready`
  - Returns live check on PostgreSQL database pool ping and Redis ping.

### 2.2 Identity & Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/auth/register` | None | Register a new account; dispatches verification email to outbox |
| `POST` | `/api/v1/auth/login` | None | Authenticate with email + password; sets HTTP-only refresh cookie, returns access JWT |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token cookie and issue fresh short-lived access JWT |
| `POST` | `/api/v1/auth/logout` | JWT | Invalidate active session in DB and clear refresh cookie |
| `POST` | `/api/v1/auth/verify-email` | None | Verify email address using single-use token |
| `POST` | `/api/v1/auth/resend-verification` | None | Rate-limited resend of verification email |
| `POST` | `/api/v1/auth/forgot-password` | None | Request password reset email |
| `POST` | `/api/v1/auth/reset-password` | None | Reset password with token and Argon2id hash |
| `GET` | `/api/v1/auth/me` | JWT | Returns current authenticated user and profile |

### 2.3 User Profiles & Following (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/users/:username` | None | Public author profile, social links, statistics |
| `PATCH` | `/api/v1/users/me` | JWT | Update display name, bio, social links, avatar |
| `POST` | `/api/v1/users/:username/follow` | JWT | Follow an author (requires login) |
| `DELETE` | `/api/v1/users/:username/follow` | JWT | Unfollow an author |

### 2.4 Articles & Publishing (`/api/v1/articles`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/articles` | None | Public article feed (params: `tag`, `category`, `search`, `author`, `sort=recent\|trending`, `page`, `limit`) |
| `GET` | `/api/v1/articles/:slug` | None | Read full published article (increments view counter) |
| `POST` | `/api/v1/articles` | JWT (Author) | Create new article or draft |
| `PATCH` | `/api/v1/articles/:id` | JWT (Owner) | Update draft or published article content |
| `DELETE` | `/api/v1/articles/:id` | JWT (Owner) | Soft-delete article |
| `POST` | `/api/v1/articles/:id/publish` | JWT (Owner) | Publish a draft article |
| `POST` | `/api/v1/articles/:id/unpublish`| JWT (Owner) | Revert article back to draft |
| `GET` | `/api/v1/articles/:id/versions` | JWT (Owner) | Retrieve revision history list |
| `POST` | `/api/v1/articles/upload-url` | JWT (Author) | Request presigned S3 PUT URL for image assets |

### 2.5 Social Engagement (`/api/v1/articles/:id/...`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/articles/:id/like` | JWT | Like an article (idempotent) |
| `DELETE` | `/api/v1/articles/:id/like` | JWT | Remove like from an article |
| `POST` | `/api/v1/articles/:id/bookmark`| JWT | Bookmark an article for reading list |
| `DELETE` | `/api/v1/articles/:id/bookmark`| JWT | Remove bookmark |
| `GET` | `/api/v1/articles/:id/comments`| None | Publicly view threaded comments |
| `POST` | `/api/v1/articles/:id/comments`| JWT | Post a new comment or threaded reply |
| `PATCH` | `/api/v1/comments/:id` | JWT (Owner) | Edit comment content |
| `DELETE` | `/api/v1/comments/:id` | JWT (Owner) | Mark comment as deleted |

### 2.6 Taxonomies & Publications (`/api/v1/...`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/categories` | None | List all curated categories with counts |
| `GET` | `/api/v1/tags` | None | List popular and trending technical tags |
| `GET` | `/api/v1/publications/:slug` | None | Public publication profile and curated articles |
| `POST` | `/api/v1/publications` | JWT | Create a new technical publication |
| `PATCH` | `/api/v1/publications/:id` | JWT (Owner) | Update publication settings and branding |

### 2.7 Advertisements (`/api/v1/ads`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/ads/placements/:location`| None | Fetch active advertisement for placement |
| `POST` | `/api/v1/ads/placements/:id/impression` | None | Record genuine impression with deduplicated viewer hash |
| `POST` | `/api/v1/ads/placements/:id/click` | None | Record click event with deduplicated viewer hash |

### 2.8 Super Admin Center (`/api/v1/admin`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/admin/overview` | Admin | Real-time platform metrics, user/article counts |
| `GET` | `/api/v1/admin/users` | Admin | Paginated user list with role and status filtering |
| `PATCH` | `/api/v1/admin/users/:id/role` | Super Admin | Change user role (e.g. promote to moderator/admin) |
| `PATCH` | `/api/v1/admin/users/:id/status`| Admin | Suspend or reactivate user account |
| `GET` | `/api/v1/admin/articles` | Admin | Review published and reported articles |
| `PATCH` | `/api/v1/admin/articles/:id/takedown` | Moderator | Takedown article violating guidelines |
| `GET` | `/api/v1/admin/reports` | Moderator | Triage abuse/spam reports |
| `PATCH` | `/api/v1/admin/reports/:id` | Moderator | Resolve or dismiss report |
| `GET` | `/api/v1/admin/ads` | Admin | Manage advertisements and placements |
| `POST` | `/api/v1/admin/ads` | Admin | Create new advertisement campaign |
| `GET` | `/api/v1/admin/emails/outbox` | Admin | Monitor email outbox queue and failures |
| `POST` | `/api/v1/admin/emails/retry/:id` | Admin | Manually retry failed outbox record |
| `GET` | `/api/v1/admin/audit-logs` | Admin | Read-only administrative audit log feed |
| `GET` | `/api/v1/admin/settings` | Admin | Read platform configuration keys |
| `PUT` | `/api/v1/admin/settings` | Super Admin | Update platform configuration keys |

