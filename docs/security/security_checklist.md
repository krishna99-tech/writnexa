# WRITNEXA Production Security Checklist & Hardening Verification

This checklist validates the security posture of the QUORIX platform prior to production traffic activation.

---

## 1. Network & Transport Security

- [x] **TLS 1.2 & 1.3 Strict Enforcement**: In `docker/nginx/quorix.conf`, legacy SSLv3, TLS 1.0, and TLS 1.1 are explicitly disabled.
- [x] **HSTS (HTTP Strict Transport Security)**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header enabled across all responses.
- [x] **Secure Cookies**: Refresh token cookies dispatched with `HttpOnly`, `Secure`, and `SameSite=Lax`.
- [x] **Strict CORS Whitelisting**: Exact domain verification against `CORS_ALLOWED_ORIGINS` with credentials support; wildcard origins forbidden.
- [x] **Reverse Proxy Isolation**: Database and Redis ports are bound exclusively to Docker's internal bridge network and never exposed to the public internet.

---

## 2. Authentication & Authorization Hardening

- [x] **Argon2id Password Hashing**: Passwords hashed using OWASP-recommended parameters (`m=65536, t=3, p=4`).
- [x] **JWT Cryptographic Entropy**: Signed with high-entropy SHA-256 HMAC keys (256-bit entropy).
- [x] **Refresh Token Rotation**: Refresh tokens are single-use; rotation detects replay attacks and revokes the active session tree.
- [x] **Hierarchical RBAC**: Strict role enforcement (`user`, `author`, `moderator`, `admin`, `super_admin`) executed in backend Go middleware (`RequireRole`).
- [x] **Administrative Audit Trail**: Every sensitive mutation by administrators (role elevation, user suspension, moderation action) writes immutable rows to `admin_audit_logs`.

---

## 3. Input Validation & Content Security

- [x] **Safe Markdown & Content Sanitization**: User markdown in articles, studio previews, and comments is parsed and sanitized against XSS vectors, preventing `javascript:` URI schemes and dangerous HTML attributes.
- [x] **Media Upload Validation**:
  - Magic-byte sniffing (`image/jpeg`, `image/png`, `image/gif`, `image/webp`).
  - Max file size enforcement (5 MB limit).
  - Filename sanitization converting all uploads to random UUIDv4 paths.
  - SSRF protection: outbound image URL fetching blocks loopback (`127.0.0.0/8`), private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS metadata service (`169.254.169.254`).
- [x] **PostgreSQL Full-Text Search Injection Protection**: All queries utilize parameterized SQL and sqlc query generation; no raw SQL concatenation.

---

## 4. API Rate Limiting & Denial of Service Protection

- [x] **Nginx Ingress Rate Limiting**:
  - API zone: `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;`
  - Authentication zone: `limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;`
- [x] **Application-level Token Bucket**: Token bucket rate limiters per client IP prevent brute force attacks on `/login` and `/register`.

---

## 5. Operations & Monitoring Security

- [x] **Zero Secret Leakage**: Passwords, hashes, AWS credentials, and session tokens are stripped from logs and error payloads.
- [x] **Structured Logging**: `slog` with correlation `X-Request-ID` attached to every inbound HTTP transaction.
- [x] **Health Check Protection**: Public health probes return coarse liveness; granular operational metrics and worker failure queues require authenticated `admin` privileges.

