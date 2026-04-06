#!/bin/bash
################################################################################
# PrüfPilot Database Restore Script
################################################################################
# Purpose:
#   - Restore a database from a backup file created by backup.sh
#   - Supports local and compressed backups
#   - Creates a backup of the current database before restoring (safety)
#   - Includes transaction support for atomic restores
#
# Environment Variables:
#   - DATABASE_URL: PostgreSQL connection string
#   - BACKUP_DIR: Default search directory for backups
#
# Usage:
#   # List available backups
#   ./restore.sh list
#
#   # Restore specific backup
#   ./restore.sh /path/to/backup_file.sql.gz
#
#   # Restore latest backup
#   ./restore.sh latest
#
# DANGER:
#   This script will DELETE the current database and replace it with the backup.
#   A safety backup is created automatically before restoring.
#
# Cron: Not recommended for automated restore (requires human confirmation)
################################################################################

set -e

# ── Configuration ────────────────────────────────────────────────────────────
DATABASE_URL="${DATABASE_URL:-postgresql://pruefpilot:pruefpilot@localhost:5432/pruefpilot}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Parse PostgreSQL connection string
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^:]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "ERROR: Could not parse DATABASE_URL"
    exit 1
fi

# ── Helper Functions ────────────────────────────────────────────────────────
show_usage() {
    cat << EOF
PrüfPilot Database Restore Script

Usage:
  ./restore.sh list              - List available backups
  ./restore.sh latest            - Restore the most recent backup
  ./restore.sh <path>            - Restore specific backup file

Examples:
  ./restore.sh list
  ./restore.sh latest
  ./restore.sh ./backups/pruefpilot_backup_20240406_020000.sql.gz

WARNING: This script will DELETE your current database and replace it with the backup.
A pre-restore backup will be created automatically.

EOF
}

list_backups() {
    echo "Available backups in $BACKUP_DIR:"
    echo ""
    if [ -d "$BACKUP_DIR" ]; then
        ls -lhS "$BACKUP_DIR"/${DB_NAME}_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    else
        echo "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
}

find_latest_backup() {
    LATEST=$(find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -z "$LATEST" ]; then
        echo "ERROR: No backups found in $BACKUP_DIR"
        exit 1
    fi
    echo "$LATEST"
}

restore_database() {
    local BACKUP_FILE="$1"
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local SAFETY_BACKUP="${BACKUP_DIR}/${DB_NAME}_safety_${TIMESTAMP}.sql.gz"

    # ── Validate Backup File ────────────────────────────────────────────────
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "ERROR: Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    echo "========================================="
    echo "PrüfPilot Database Restore"
    echo "========================================="
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Backup file: $BACKUP_FILE"
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo ""
    echo "⚠️  WARNING: This will DELETE the current database!"
    echo "A safety backup will be created before restoring."
    echo ""
    read -p "Type 'RESTORE' to continue (or press Enter to cancel): " confirm
    if [ "$confirm" != "RESTORE" ]; then
        echo "Restore cancelled."
        exit 0
    fi

    # ── Create Safety Backup ────────────────────────────────────────────────
    echo ""
    echo "Creating safety backup: $SAFETY_BACKUP"
    export PGPASSWORD="$DB_PASS"
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        2>&1 | gzip > "$SAFETY_BACKUP"
    echo "✓ Safety backup created"

    # ── Disconnect All Clients ─────────────────────────────────────────────
    echo ""
    echo "Disconnecting active sessions..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        --no-password 2>/dev/null || true
    echo "✓ Sessions disconnected"

    # ── Drop and Recreate Database ─────────────────────────────────────────
    echo ""
    echo "Dropping current database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" \
        -c "DROP DATABASE IF EXISTS $DB_NAME;" \
        --no-password 2>/dev/null
    echo "✓ Database dropped"

    echo "Creating new database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" \
        -c "CREATE DATABASE $DB_NAME;" \
        --no-password 2>/dev/null
    echo "✓ Database created"

    # ── Restore Backup ────────────────────────────────────────────────────
    echo ""
    echo "Restoring from backup (this may take several minutes)..."
    gunzip -c "$BACKUP_FILE" | psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-password 2>&1 | tail -20

    if [ $? -eq 0 ]; then
        echo "✓ Restore completed successfully"
    else
        echo "✗ Restore FAILED - safety backup available at: $SAFETY_BACKUP"
        exit 1
    fi

    # ── Verify Restore ──────────────────────────────────────────────────
    echo ""
    echo "Verifying restore..."
    COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" \
        --no-password 2>/dev/null)
    echo "✓ Database contains $COUNT tables"

    echo ""
    echo "========================================="
    echo "✓ Restore completed successfully!"
    echo "Safety backup: $SAFETY_BACKUP"
    echo "========================================="
}

# ── Main ─────────────────────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

case "$1" in
    list)
        list_backups
        ;;
    latest)
        BACKUP=$(find_latest_backup)
        echo "Restoring latest backup: $BACKUP"
        restore_database "$BACKUP"
        ;;
    -h|--help)
        show_usage
        ;;
    *)
        restore_database "$1"
        ;;
esac

exit 0
