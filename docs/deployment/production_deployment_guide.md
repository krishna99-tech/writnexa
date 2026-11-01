# QUORIX Production Deployment Guide

This guide details the procedure for deploying QUORIX to production environments using Docker Compose, reverse proxying with Nginx, automated SSL provisioning, and zero-downtime database migrations.

---

## 1. Prerequisites & System Requirements

- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9 (or equivalent Linux distribution)
- **CPU & RAM**: Minimum 2 vCPUs, 4 GB RAM (Recommended: 4 vCPUs, 8 GB RAM)
- **Storage**: 40 GB NVMe SSD with automated EBS/block storage snapshots
- **Docker Engine**: version 24.0+ and Docker Compose v2.20+
- **Domain Names**:
  - Web & App: `quorix.io` and `www.quorix.io`
  - API Gateway: `api.quorix.io` (or unified reverse-proxy via path routing `/api/v1`)
  - Amazon SES Verified Sending Domain: `notifications.quorix.io`

---

## 2. Directory Structure on Host

```bash
/opt/quorix/
├── docker-compose.prod.yml
├── .env.production
├── docker/
│   └── nginx/
│       ├── nginx.conf
│       └── quorix.conf
├── certs/
│   ├── quorix.crt
│   └── quorix.key
└── backups/
```

---

## 3. Cryptographic Secret Generation

Before starting any production container, generate high-entropy secrets for JWT token signing, database passwords, and session salts:

```bash
# Generate 256-bit (64 hex characters) secrets
openssl rand -hex 32 # For JWT_ACCESS_SECRET
openssl rand -hex 32 # For JWT_REFRESH_SECRET
openssl rand -hex 24 # For DB_PASSWORD
openssl rand -hex 24 # For REDIS_PASSWORD
```

Populate `/opt/quorix/.env.production` with these values and restrict file permissions:
```bash
chmod 600 /opt/quorix/.env.production
```

---

## 4. Database Migrations Execution

Database migrations are managed using Goose and execute automatically on initialization, or can be run via standalone migration commands:

```bash
# Verify migration status
goose -dir backend/migrations postgres "postgres://quorix_app:SECURE_PASSWORD@postgres:5432/quorix_prod?sslmode=verify-full" status

# Execute pending migrations
goose -dir backend/migrations postgres "postgres://quorix_app:SECURE_PASSWORD@postgres:5432/quorix_prod?sslmode=verify-full" up
```

---

## 5. SSL / TLS Certificate Provisioning

For Let's Encrypt automated TLS certificates:
```bash
certbot certonly --standalone -d quorix.io -d www.quorix.io -d api.quorix.io --agree-tos --email admin@quorix.io
```
Symlink or copy certificates to `/opt/quorix/certs/quorix.crt` and `/opt/quorix/certs/quorix.key`.

---

## 6. Starting Production Cluster

```bash
# Pull and build production containers
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers in daemon mode
docker compose -f docker-compose.prod.yml up -d

# Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

---

## 7. Health & Verification Checklist

1. **Liveness Probe**: `curl -f http://localhost:8080/health` -> `{"status":"ok"}`
2. **Readiness Probe**: `curl -f http://localhost:8080/ready` -> `{"status":"ready","checks":{"database":"ready","redis":"ready"}}`
3. **Frontend SSR**: `curl -I https://quorix.io` -> `HTTP/2 200`
4. **HSTS Header**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
5. **Security Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`
