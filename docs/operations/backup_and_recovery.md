# QUORIX Disaster Recovery & Database Backup Runbook

## 1. Objectives & SLA Targets
- **Recovery Point Objective (RPO)**: < 5 minutes (WAL archiving enabled).
- **Recovery Time Objective (RTO)**: < 30 minutes for full platform restoration.

---

## 2. PostgreSQL 16 Backup Procedures

### 2.1 Automated Nightly Full Logical Backup (`pg_dump`)
Run daily at 02:00 UTC using the PostgreSQL custom compressed archive format (`-Fc`), enabling parallel restoration and selective table recovery.

```bash
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="/var/backups/quorix/postgres"
BACKUP_FILE="${BACKUP_DIR}/quorix_full_${TIMESTAMP}.dump"
LOG_FILE="/var/log/quorix_backup.log"

mkdir -p "${BACKUP_DIR}"

echo "[${TIMESTAMP}] Starting PostgreSQL backup..." >> "${LOG_FILE}"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  -Z 6 \
  -f "${BACKUP_FILE}"

echo "[${TIMESTAMP}] Backup completed: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))" >> "${LOG_FILE}"

# Encrypt backup using GPG or AWS KMS before offsite upload
gpg --batch --yes --encrypt --recipient ops@quorix.io "${BACKUP_FILE}"

# Offsite sync to private S3 disaster recovery bucket
aws s3 cp "${BACKUP_FILE}.gpg" "s3://${DISASTER_RECOVERY_BUCKET}/postgres/daily/" \
  --sse aws:kms \
  --sse-kms-key-id "${KMS_KEY_ARN}"

# Clean up local unencrypted dump and retain 14 days locally
rm -f "${BACKUP_FILE}"
find "${BACKUP_DIR}" -type f -name "*.gpg" -mtime +14 -delete
```

### 2.2 Continuous Write-Ahead Logging (WAL) Archiving
For point-in-time recovery (PITR) down to the exact second of failure:
In `postgresql.conf`:
```ini
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://${DISASTER_RECOVERY_BUCKET}/postgres/wal/%f --sse aws:kms'
archive_timeout = 300
```

---

## 3. Restoration & Recovery Runbook

### 3.1 Restoring Full Logical Backup to New Database
In the event of database corruption or hardware failure:

1. **Provision target database server** and create a clean database:
   ```bash
   createdb -h localhost -U quorix_user quorix_db_recovery
   ```

2. **Decrypt archive**:
   ```bash
   gpg --decrypt quorix_full_20261101_020000Z.dump.gpg > quorix_restore.dump
   ```

3. **Execute parallel restoration with `pg_restore`**:
   ```bash
   pg_restore -h localhost -U quorix_user -d quorix_db_recovery \
     --no-owner --clean --if-exists -j 4 quorix_restore.dump
   ```

4. **Verify database integrity**:
   ```sql
   SELECT count(*) FROM users;
   SELECT count(*) FROM articles;
   SELECT version FROM goose_db_version;
   ```

5. **Update connection strings** in application environment (`.env`) and restart API services.

### 3.2 Point-In-Time Recovery (PITR) to Specific Timestamp
If a catastrophic accidental deletion occurred at `2026-11-01 14:32:00 UTC`:

1. Stop PostgreSQL service.
2. Restore base backup to `$PGDATA`.
3. Create `recovery.signal` in `$PGDATA`.
4. Configure `postgresql.conf`:
   ```ini
   restore_command = 'aws s3 cp s3://${DISASTER_RECOVERY_BUCKET}/postgres/wal/%f %p'
   recovery_target_time = '2026-11-01 14:31:00 UTC'
   recovery_target_action = 'promote'
   ```
5. Start PostgreSQL and verify logs indicate archive replay has promoted to primary.

---

## 4. Redis 7 Snapshotting & AOF Persistence

QUORIX uses Redis for sessions, rate limiting, and temporary cache acceleration. While cache data is ephemeral, user session tokens benefit from durability:

### 4.1 Persistence Configuration (`redis.conf`)
```ini
# RDB point-in-time snapshots
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /var/lib/redis

# Append-Only File (AOF) for near-zero data loss
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### 4.2 Restoring Redis
If Redis crashes or restarts:
1. Place the latest `dump.rdb` or `appendonly.aof` file into `/var/lib/redis/`.
2. Start the `redis-server` process. Redis automatically loads state into memory on startup.

---

## 5. Disaster Recovery Testing Cadence
- **Weekly Automated Test**: Test restoration script imports latest snapshot into an isolated staging environment and runs automated schema migration checks.
- **Quarterly Drill**: Scheduled simulation of primary database failover with documented sign-off from Platform Engineering.
