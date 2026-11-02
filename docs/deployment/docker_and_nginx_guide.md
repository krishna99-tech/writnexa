# WRITNEXA — Production Docker & NGINX Architecture Guide

This document is the definitive engineering specification for the containerized deployment topology, NGINX ingress reverse proxy, SSL/TLS termination, rate limiting, and multi-stage container build pipelines powering **WRITNEXA** (`writnexa.dev`).

---

## 1. High-Level Ingress & Container Topology

WRITNEXA employs a defense-in-depth, perimeter-isolated architecture. The host machine exposes only HTTP (Port 80) and HTTPS (Port 443) to the public Internet. All application runtimes (Next.js frontend and Go backend) and persistent datastores (PostgreSQL 16 and Redis 7) communicate across an isolated, non-routed internal Docker bridge network (`quorix_internal`).

```mermaid
flowchart TD
    subgraph PublicInternet["Public Internet & Edge Network"]
        ClientHTTPS["Client Traffic\n(HTTPS :443)"]
        ClientHTTP["Client Traffic\n(HTTP :80)"]
    end

    subgraph HostBoundary["Production Host Boundary (writnexa.dev)"]
        subgraph IngressTier["Perimeter Ingress Gateway (quorix-nginx-prod)"]
            NGINX["NGINX 1.27 Alpine\n• TLS 1.2 / TLS 1.3 Termination\n• HTTP to HTTPS 301 Redirection\n• Dual-Zone Rate Limiting\n• Gzip Compression Engine\n• Immutable Next.js Asset Caching"]
        end

        subgraph DockerNetwork["Internal Network (quorix_internal)"]
            Frontend["Frontend Runtime (quorix-frontend-prod)\n• Next.js 16 App Router\n• Node.js 22 Alpine Standalone\n• Internal Port: :3000\n• Non-root User: nextjs (1001)"]
            
            Backend["Backend Microservice (quorix-backend-prod)\n• Go Gin Modular Monolith\n• CGO_ENABLED=0 Alpine Binary\n• Internal Port: :8080\n• Non-root User: appuser (10001)"]

            Databases["Data Persistence Tier"]
            Postgres[("PostgreSQL 16 Alpine (quorix-postgres-prod)\n• Internal Port: :5432\n• Volume: postgres_prod_data\n• Healthcheck: pg_isready")]
            Redis[("Redis 7 Alpine (quorix-redis-prod)\n• Internal Port: :6379\n• Volume: redis_prod_data\n• AOF Persistence & Password Auth\n• Healthcheck: redis-cli ping")]
        end
    end

    ClientHTTP -->|HTTP :80 (ACME or 301 Redirect)| NGINX
    ClientHTTPS -->|HTTPS :443 (HTTP/2)| NGINX

    NGINX -->|"/_next/static/* (Cached 365d)"| Frontend
    NGINX -->|"/* (SSR Pages, RSC, WebSockets)"| Frontend
    NGINX -->|"/api/v1/auth/* (Rate Limit: 5r/s)"| Backend
    NGINX -->|"/api/* (Rate Limit: 30r/s)"| Backend
    NGINX -->|"/health & /ready (Probes)"| Backend

    Backend -->|SQL Connection Pool (pgx)| Postgres
    Backend -->|Cache, Tokens, Deduplication| Redis
```

---

## 2. Ingress Network & Port Isolation Matrix

Direct port binding to host network interfaces is strictly forbidden for all backend and database containers. Only the NGINX ingress container binds to host interfaces.

| Container Name | Service Image | Public Host Ports | Internal Network Port | Network Alias | Healthcheck Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `quorix-nginx-prod` | `nginx:1.27-alpine` | `80:80`, `443:443` | — | `nginx` | HTTP Ingress Probes (`/health`) |
| `quorix-frontend-prod` | `node:22-alpine` (Custom) | *None* | `3000` | `frontend` | Upstream Keepalive (`quorix_frontend`) |
| `quorix-backend-prod` | `alpine:3.20` (Custom) | *None* | `8080` | `backend` | Native HTTP `/health` & `/ready` |
| `quorix-postgres-prod` | `postgres:16-alpine` | *None* | `5432` | `postgres` | `pg_isready -U quorix_admin -d quorix_prod` |
| `quorix-redis-prod` | `redis:7-alpine` | *None* | `6379` | `redis` | `redis-cli ping` |

---

## 3. NGINX Gateway Architecture & Configuration

The NGINX configuration is partitioned into two distinct scopes:
1. **Global Engine Configuration** (`docker/nginx/nginx.conf`): Worker tuning, asynchronous I/O event loop, logging format, Gzip compression, and rate-limiting memory zones.
2. **Virtual Host Routing & Security** (`docker/nginx/quorix.conf`): SSL/TLS parameters, HSTS, security headers, upstreams, route matching, caching rules, and WebSocket upgrading.

### 3.1 Event Loop & Kernel Tuning (`nginx.conf`)

```nginx
events {
    worker_connections  2048;   # Max concurrent connections per worker
    multi_accept        on;     # Worker accepts all new connections at once
    use                 epoll;  # Scalable I/O event notification mechanism for Linux
}
```

- **Zero-Copy File Transfers**: `sendfile on; tcp_nopush on; tcp_nodelay on;` maximizes TCP throughput and eliminates context switches between kernel space and user space.
- **Server Obfuscation**: `server_tokens off;` suppresses the NGINX version string in HTTP response headers and error pages.

### 3.2 High-Granularity Upstream Observability Logging

NGINX outputs a structured log format capturing round-trip latencies across upstreams:

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';
```

- `$request_time`: Full round-trip transaction latency in seconds with millisecond resolution.
- `$upstream_connect_time`: Time spent establishing a TCP handshake with the backend or frontend container.
- `$upstream_header_time`: Time taken by the upstream to deliver the response header.
- `$upstream_response_time`: Total upstream response duration.

### 3.3 Dynamic Gzip Compression Engine

NGINX applies Gzip level 6 compression to text, JSON, and font payloads exceeding 256 bytes:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
    application/atom+xml
    application/javascript
    application/json
    application/manifest+json
    application/rss+xml
    application/xml
    image/svg+xml
    text/css
    text/javascript
    text/plain
    text/xml;
```

---

## 4. Reverse Proxy Routing, Security & Caching Policy

The virtual host configuration (`docker/nginx/quorix.conf`) defines how incoming requests on `writnexa.dev` are processed, authenticated, cached, and forwarded.

### 4.1 Ingress Routing Table

| Route URI Pattern | Destination Upstream | Rate Limiter Zone | Cache Policy | Timeout | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/.well-known/acme-challenge/*` | Host certbot directory | *None* | `no-cache` | — | Let's Encrypt automated challenge validation |
| `/` (HTTP 80) | `return 301 https://...` | *None* | Permanent Redirect | — | Strict HTTP to HTTPS upgrade |
| `/health`, `/ready` | `http://quorix_backend` | *None* | `no-cache` | 30s | Container health & zero-downtime readiness probes |
| `/api/v1/auth/*` | `http://quorix_backend` | `auth_limit` (5r/s, burst 10) | `no-store` | 30s | Login, registration, credential recovery (Brute-force shield) |
| `/api/*` | `http://quorix_backend` | `api_general` (30r/s, burst 50) | Dynamic / API-controlled | 60s | REST API, articles, comments, analytics endpoints |
| `/_next/static/*` | `http://quorix_frontend` | *None* | `public, max-age=31536000, immutable` | 60s | Pre-compiled JS, CSS, and font chunks |
| `/*` (All other routes) | `http://quorix_frontend` | *None* | Dynamic SSR / RSC | 60s | Next.js App Router, SSR pages, WebSockets (`Upgrade`) |

### 4.2 Dual-Tier DDoS & Brute-Force Rate Limiting

Rate limiting zones utilize `$binary_remote_addr`, using 64 bytes per client state in an allocation of 10 MB (storing ~160,000 concurrent IP addresses):

```nginx
# In nginx.conf:
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

# In quorix.conf:
# 1. High-security authentication protection
location ~* ^/api/v1/auth/ {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://quorix_backend;
    ...
}

# 2. General API protection
location /api/ {
    limit_req zone=api_general burst=50 nodelay;
    proxy_pass http://quorix_backend;
    ...
}
```

- `burst=10 nodelay` on auth routes allows a burst of legitimate rapid interactions while dropping volumetric dictionary or credential-stuffing attacks immediately with HTTP 429 Too Many Requests.
- `burst=50 nodelay` on general API routes accommodates page navigation bursts without lagging legitimate users.

### 4.3 Static Asset Caching Strategy (`/_next/static/*`)

Next.js generates cryptographically hashed bundle names for static assets (e.g., `_next/static/chunks/app/layout-c1a4e8d3.js`). Because these file names change on every code compilation, NGINX aggressively caches them for one full year:

```nginx
location /_next/static/ {
    proxy_pass http://quorix_frontend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    expires 365d;
    access_log off;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

- Eliminates disk and CPU utilization on the frontend container for repeated static requests.
- Completely suppresses access log writes for static chunks, saving gigabytes of disk I/O under high traffic.

### 4.4 Modern TLS Configuration & HSTS

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# 2-year HSTS with preload
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Browser hardening headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
```

---

## 5. Multi-Stage Container Build Specifications

Both backend and frontend services are packaged using multi-stage Docker builds. The compiler toolchains, package managers, and source trees are discarded in intermediate build stages, leaving minimal, unprivileged container runtimes.

### 5.1 Go Backend Container (`backend/Dockerfile`)

```dockerfile
# -------------------------------------------------------------------------
# Stage 1: Build Statically Linked Binary
# -------------------------------------------------------------------------
FROM golang:alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/bin/quorix-api ./cmd/api

# -------------------------------------------------------------------------
# Stage 2: Hardened, Unprivileged Runtime Image (~25MB)
# -------------------------------------------------------------------------
FROM alpine:3.20
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

COPY --from=builder /app/bin/quorix-api /app/quorix-api
COPY --from=builder /app/migrations /app/migrations

USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/quorix-api"]
```

- **CGO_ENABLED=0**: Ensures zero dependency on host dynamic C libraries (`libc`/`musl`), producing a fully standalone binary.
- `-ldflags="-w -s"`: Strips DWARF debug symbols and symbol tables, shrinking binary size by ~35%.
- **Non-Root Execution**: Runs strictly as UID `10001` (`appuser`).

### 5.2 Next.js Standalone Frontend Container (`frontend/Dockerfile`)

```dockerfile
# -------------------------------------------------------------------------
# Stage 1: Dependency Resolution
# -------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# -------------------------------------------------------------------------
# Stage 2: Standalone Production Build
# -------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -------------------------------------------------------------------------
# Stage 3: Minimal Node Runner Image
# -------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- **Next.js Standalone Output**: By setting `output: 'standalone'` in `next.config.ts`, Next.js traces all imported node modules and outputs an optimized `server.js`.
- Eliminates the bulk of the `node_modules` folder from the production image, cutting the container image size from >1 GB down to ~120 MB.
- Runs strictly under unprivileged UID `1001` (`nextjs`).

---

## 6. Datastore Persistence & Health Checks

### 6.1 PostgreSQL 16 Alpine
- **Persistence**: Managed through the named Docker volume `postgres_prod_data` mounted at `/var/lib/postgresql/data`.
- **Health Check Probe**:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-quorix_admin} -d ${DB_NAME:-quorix_prod}"]
    interval: 10s
    timeout: 5s
    retries: 5
  ```
- Backend container initialization is blocked until PostgreSQL returns an active, healthy connection state (`condition: service_healthy`).

### 6.2 Redis 7 Alpine
- **Persistence**: Managed through `redis_prod_data` mounted at `/data` with Append-Only File (AOF) logging enabled (`--appendonly yes`).
- **Health Check Probe**:
  ```yaml
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  ```

---

## 7. Zero-Downtime Deployment & Configuration Reload

Because NGINX decouples client connections from upstream workers, configuration changes and certificate renewals can be applied without dropping active TCP connections:

### 7.1 Testing NGINX Configuration Inside the Container
Verify that syntax and upstream declarations are valid before triggering a reload:
- NGINX validates all directives and certificate chains.
- Exit code 0 indicates configuration safety.

### 7.2 Zero-Downtime Configuration Reload
Executing an asynchronous `SIGHUP` signal instructs the NGINX master process to start new worker processes with the updated configuration while allowing existing workers to drain active client requests gracefully:
- Client connections never experience resets or drops.
- Updated SSL certificates or upstream locations become active instantly.

### 7.3 Automated SSL Certificate Lifecycle
Certbot issues and renews certificates using the webroot plugin:
1. Certbot deposits the cryptographic token into `/var/www/certbot/.well-known/acme-challenge/`.
2. NGINX serves this challenge directly from port 80.
3. Upon validation, Let's Encrypt issues certificates to `/etc/nginx/ssl/`.
4. A post-renewal hook reloads NGINX gracefully.

---

## 8. Diagnostic & Troubleshooting Reference

| Symptom | Diagnostic Root Cause | Remediation Procedure |
| :--- | :--- | :--- |
| **HTTP 502 Bad Gateway on `/api/*`** | Go backend container is restarting or failing healthcheck | Verify backend logs for database migration lock or unhandled panic. Confirm PostgreSQL container is reporting healthy. |
| **HTTP 504 Gateway Timeout** | Database query or external service (e.g., SES) exceeding 60s proxy timeout | Inspect slow query logs in PostgreSQL or check network latency to AWS SES endpoints. |
| **HTTP 429 Too Many Requests** | Rate limiting threshold exceeded (`auth_limit` or `api_general`) | Confirm if client traffic is concentrated behind a single corporate NAT/VPN. Verify `$binary_remote_addr` configuration. |
| **WebSocket connection failed** | Missing `Upgrade` / `Connection` proxy headers | Verify `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` in the frontend server block. |
| **CSS/JS 404 after frontend deploy** | Frontend container rebuilt with new chunk hashes while old HTML is cached | Invalidate CDN edge caches and verify NGINX `/_next/static/` proxy passes to the newly deployed frontend container. |

