#!/bin/bash
################################################################################
# PrüfPilot Database Backup Script
################################################################################
# Purpose:
#   - Create a timestamped backup of the PostgreSQL database
#   - Compresses the backup to save storage space
#   - Supports remote backup storage via environment variables
#   - Maintains local retention policy (keeps last N backups)
#
# Environment Variables:
#   - DATABASE_URL: PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/pruefpilot)
#   - BACKUP_DIR: Local backup directory (default: ./backups)
#   - BACKUP_RETENTION_DAYS: Keep backups for N days (default: 30)
#   - AWS_S3_BUCKET: Optional S3 bucket for remote backups
#   - AWS_REGION: Optional AWS region
#
# Usage:
#   ./backup.sh                    # Use defaults
#   BACKUP_DIR=/mnt/backups ./backup.sh
#   AWS_S3_BUCKET=my-backups ./backup.sh
#
# Cron Example (daily at 2 AM):
#   0 2 * * * cd /app && ./scripts/backup.sh >> /var/log/pruefpilot-backup.log 2>&1
################################################################################

set -e  # Exit on any error

# ── Configuration ────────────────────────────────────────────────────────────
DATABASE_URL="${DATABASE_URL:-postgresql://pruefpilot:pruefpilot@localhost:5432/pruefpilot}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-eu-central-1}"

# Parse PostgreSQL connection string
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "ERROR: Could not parse DATABASE_URL. Expected format: postgresql://user:pass@host:port/dbname"
    exit 1
fi

# ── Setup ────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"
BACKUP_LOG="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "$BACKUP_DIR"

echo "========================================" | tee -a "$BACKUP_LOG"
echo "PrüfPilot Database Backup" | tee -a "$BACKUP_LOG"
echo "Timestamp: $TIMESTAMP" | tee -a "$BACKUP_LOG"
echo "Database: $DB_NAME" | tee -a "$BACKUP_LOG"
echo "Host: $DB_HOST:$DB_PORT" | tee -a "$BACKUP_LOG"
echo "Output: $BACKUP_FILE" | tee -a "$BACKUP_LOG"
echo "========================================" | tee -a "$BACKUP_LOG"

# ── Backup Database ──────────────────────────────────────────────────────────
echo "Starting backup at $(date)..." | tee -a "$BACKUP_LOG"

export PGPASSWORD="$DB_PASS"
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    2>&1 | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✓ Backup completed successfully at $(date)" | tee -a "$BACKUP_LOG"
    echo "✓ Backup size: $BACKUP_SIZE" | tee -a "$BACKUP_LOG"
else
    echo "✗ Backup FAILED at $(date)" | tee -a "$BACKUP_LOG"
    exit 1
fi

# ── Upload to S3 (Optional) ──────────────────────────────────────────────────
if [ -n "$AWS_S3_BUCKET" ]; then
    echo "Uploading to S3 bucket: s3://${AWS_S3_BUCKET}..." | tee -a "$BACKUP_LOG"
    if command -v aws &> /dev/null; then
        if aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BUCKET}/pruefpilot-backups/${TIMESTAMP}/" \
            --region "$AWS_REGION" \
            --sse AES256 \
            2>&1 | tee -a "$BACKUP_LOG"; then
            echo "✓ S3 upload successful" | tee -a "$BACKUP_LOG"
        else
            echo "✗ S3 upload FAILED (local backup preserved)" | tee -a "$BACKUP_LOG"
        fi
    else
        echo "⚠ AWS CLI not found, skipping S3 upload" | tee -a "$BACKUP_LOG"
    fi
fi

# ── Cleanup Old Backups ──────────────────────────────────────────────────────
echo "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..." | tee -a "$BACKUP_LOG"
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -exec rm -v {} \; 2>&1 | tee -a "$BACKUP_LOG"

OLD_LOGS=$(find "$BACKUP_DIR" -name "backup_*.log" -mtime +$BACKUP_RETENTION_DAYS -exec rm -v {} \; 2>&1)
if [ -n "$OLD_LOGS" ]; then
    echo "$OLD_LOGS" | tee -a "$BACKUP_LOG"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
echo "========================================" | tee -a "$BACKUP_LOG"
echo "Backup Summary:" | tee -a "$BACKUP_LOG"
echo "  Total backups in storage: $BACKUP_COUNT" | tee -a "$BACKUP_LOG"
echo "  Latest backup: $BACKUP_FILE" | tee -a "$BACKUP_LOG"
echo "  Log file: $BACKUP_LOG" | tee -a "$BACKUP_LOG"
echo "========================================" | tee -a "$BACKUP_LOG"

# ── Verification ────────────────────────────────────────────────────────────
echo "Verifying backup integrity..." | tee -a "$BACKUP_LOG"
if gunzip -t "$BACKUP_FILE" 2>&1 | tee -a "$BACKUP_LOG"; then
    echo "✓ Backup integrity verified" | tee -a "$BACKUP_LOG"
else
    echo "✗ Backup integrity check FAILED" | tee -a "$BACKUP_LOG"
    exit 1
fi

echo "Backup completed successfully!" | tee -a "$BACKUP_LOG"
exit 0
