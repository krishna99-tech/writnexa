# WRITNEXA — Amazon SES Integration & Email Architecture Guide

This document describes the email delivery architecture for QUORIX, detailing how to configure Amazon SES via either the **AWS SDK v2 API** or the **Amazon SES SMTP Relay**, manage PostgreSQL transactional outbox queues, setup DNS authentication (DKIM, SPF, DMARC), and graduate from the SES sandbox into production.

---

## 1. Quick Start: Using SES SMTP Relay Credentials

If you already have Amazon SES SMTP relay credentials (**username, password, host, port**), you can plug them directly into your environment without needing AWS IAM keys.

### Environment Configuration (`backend/.env`):
```env
# Email Provider Selection: "smtp" (for SES relay), "ses" (for AWS SDK v2), or "mock" (for local dev)
EMAIL_PROVIDER=smtp
EMAIL_DEV_MODE=false

# Sender Identity
EMAIL_FROM=QUORIX <noreply@yourdomain.com>
EMAIL_REPLY_TO=support@yourdomain.com

# Amazon SES SMTP Relay Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com   # Replace with your SES region host
SMTP_PORT=587                                # Standard SES port with STARTTLS (or 465 for SSL/TLS)
SMTP_USERNAME=AKIAIOSFODNN7EXAMPLE            # Your SES SMTP Username
SMTP_PASSWORD=BOr/281Fm+z7nEXAMPLE           # Your SES SMTP Password

# Outbox Worker Configuration
EMAIL_WORKER_POLL=3s                         # Polling interval for outbox worker
EMAIL_WORKER_BATCH=10                        # Number of emails processed per tick
EMAIL_MAX_RETRIES=3                          # Max delivery retry attempts before marking 'failed'
```

> [!NOTE]
> Amazon SES SMTP usernames and passwords are **not** the same as standard AWS IAM secret access keys. AWS SES generates a specially calculated SMTP password derived from an IAM user's credentials.

---

## 2. Alternative: AWS SDK for Go v2 (IAM Credential Chain)

If you deploy on AWS (EC2, ECS, or EKS) or prefer the AWS SDK v2 REST API, set `EMAIL_PROVIDER=ses`. The application automatically uses the **AWS Default Credential Provider Chain**:

```env
EMAIL_PROVIDER=ses
EMAIL_DEV_MODE=false
AWS_REGION=us-east-1

# Optional if running locally with static keys; NEVER commit these to git:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

When running inside AWS cloud infrastructure, **do not set static keys**. Attach an IAM Role with the following minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "arn:aws:ses:us-east-1:*:identity/*"
    }
  ]
}
```

---

## 3. Development / Mock Mode

When developing locally or running automated CI/CD pipelines, set `EMAIL_DEV_MODE=true` or `EMAIL_PROVIDER=mock`:

```env
EMAIL_PROVIDER=mock
EMAIL_DEV_MODE=true
```

- Emails are fully rendered (both HTML and text parts) and saved to the PostgreSQL `email_outbox` table.
- The background worker executes and transitions records to `sent`, generating a mock SES Message ID (`mock-ses-...`).
- Rendered payloads are logged to `slog` with zero network requests dispatched to external mail servers.

---

## 4. PostgreSQL Transactional Email Outbox Pattern

Direct synchronous email sending inside HTTP request handlers causes slow user responses, timeout errors, and lost emails during external provider hiccups. QUORIX implements the **Transactional Outbox Pattern**:

```
+-----------------------------------------------------------------------------------+
|  HTTP Request (e.g. POST /register)                                               |
|  1. DB Transaction: Create User -> Create Profile -> Create Token                 |
|  2. Enqueue Email in PostgreSQL `email_outbox` (status='pending')                |
|  3. Commit Transaction (Atomic guarantees)                                        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|  PostgreSQL Database                                                              |
|  Table: `email_outbox`                                                            |
|  - `id`: UUID PRIMARY KEY                                                         |
|  - `recipient_email`, `recipient_name`, `template_name`, `subject`                |
|  - `html_body`, `text_body`, `payload_json`                                       |
|  - `status`: 'pending' | 'sending' | 'sent' | 'failed'                            |
|  - `retry_count`, `next_retry_at`, `ses_message_id`, `sent_at`                    |
+-----------------------------------------+-----------------------------------------+
                                          |
                        Polls every 3s    | (SELECT ... FOR UPDATE SKIP LOCKED)
                                          v
+-----------------------------------------------------------------------------------+
|  Background Outbox Worker (worker.go)                                             |
|  1. Fetches batch of pending items                                                |
|  2. Dispatches via SES API or SES SMTP Relay                                      |
|  3. On Success:                                                                   |
|     - Updates outbox status = 'sent', records ses_message_id                      |
|     - Appends entry into `email_logs` audit table                                 |
|  4. On Failure:                                                                   |
|     - Computes exponential backoff: NextRetry = Now() + (2^retry * 15s)           |
|     - If retry >= max_retries, marks outbox status = 'failed'                     |
|     - Logs failure reason in `email_logs`                                         |
+-----------------------------------------------------------------------------------+
```

---

## 5. Domain DNS Verification: DKIM, SPF, and DMARC

To ensure high inbox placement and prevent spoofing, configure these DNS records on your domain registrar (e.g., Cloudflare, Route53, Namecheap).

### A. Domain Verification & Easy DKIM (3 CNAME Records)
In the Amazon SES Console (**Identities > Create Identity > Domain**):
- Enter your domain (e.g., `writnexa.dev`).
- Select **Easy DKIM** (RSA 2048-bit).
- SES generates 3 CNAME records. Add them to your DNS:

| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| `CNAME` | `<token1>._domainkey.writnexa.dev` | `<token1>.dkim.amazonses.com` | Auto / 300 |
| `CNAME` | `<token2>._domainkey.writnexa.dev` | `<token2>.dkim.amazonses.com` | Auto / 300 |
| `CNAME` | `<token3>._domainkey.writnexa.dev` | `<token3>.dkim.amazonses.com` | Auto / 300 |

### B. Custom MAIL FROM Domain & SPF
By default, SES uses `amazonses.com` in the envelope MAIL FROM address, which fails strict DMARC alignment. Configure a custom MAIL FROM subdomain (e.g., `mail.writnexa.dev`):

1. **MX Record** (for bounce processing):
   - Type: `MX`
   - Name: `mail.writnexa.dev`
   - Value: `feedback-smtp.us-east-1.amazonses.com`
   - Priority: `10`
2. **SPF TXT Record**:
   - Type: `TXT`
   - Name: `mail.writnexa.dev`
   - Value: `v=spf1 include:amazonses.com ~all`
3. **Root Domain SPF Record** (if sending from `@writnexa.dev`):
   - Type: `TXT`
   - Name: `@` (or `writnexa.dev`)
   - Value: `v=spf1 include:amazonses.com ~all`

### C. DMARC Policy (Domain-based Message Authentication)
Add a TXT record to protect your brand and monitor deliverability:

| Type | Name | Value |
| :--- | :--- | :--- |
| `TXT` | `_dmarc.writnexa.dev` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@writnexa.dev` |

*Policy Explanation*:
- `p=quarantine`: Diverts unauthenticated mail to spam/junk folders instead of outright rejection while warming up.
- `pct=100`: Applies to 100% of outbound messages.
- `rua=mailto:...`: Receives aggregate authentication XML reports from Gmail, Microsoft, Yahoo.

---

## 6. Graduating from Amazon SES Sandbox to Production

New AWS SES accounts start in the **Sandbox Environment**, where:
- You can only send to verified email addresses or the Amazon SES mailbox simulator.
- You have a strict limit of 200 emails per 24 hours at 1 email per second.

### Step-by-Step Production Access Request:
1. Navigate to **Amazon SES Console > Account dashboard**.
2. Click **Request production access**.
3. Fill out the application with the following production-grade responses:
   - **Mail type**: Transactional.
   - **Website URL**: `https://writnexa.dev` (or your staging/live domain).
   - **How do you acquire email addresses?**:
     > *"Email addresses are collected strictly when software developers register for a QUORIX account via our double opt-in verification form. We never purchase or scrape email lists."*
   - **How will you handle bounces and complaints?**:
     > *"We utilize Amazon SES SNS notifications to automatically deactivate accounts that trigger Hard Bounces or Spam Complaints. Our platform enforces an automated outbox queue with exponential backoff and rate-limiting."*
   - **How can recipients opt out?**:
     > *"Every notification contains direct links to user notification preferences at `/settings`, where users can toggle follower, comment, and article update alerts. System transactional emails (password reset, security alerts) are strictly single-use."*
4. AWS typically approves requests within 24 to 48 hours, granting an initial quota of 50,000 emails per day at 14 emails per second.

---

## 7. Supported Transactional Templates

| Template Key | Subject Preview | Trigger Event | Plain-Text & HTML |
| :--- | :--- | :--- | :--- |
| `welcome` | `Welcome to QUORIX, @{username}` | Email verification completed | Yes |
| `email_verification` | `Verify your email address for QUORIX` | User registration / resend | Yes |
| `password_reset` | `Reset your QUORIX account password` | Forgot password submitted | Yes |
| `password_changed` | `Security Alert: Your QUORIX password was changed` | Password reset or changed | Yes |
| `new_follower` | `@{follower} started following you on QUORIX` | New author follower | Yes (Respects prefs) |
| `new_comment` | `New comment from @{user} on "{article}"` | New discussion comment | Yes (Respects prefs) |

