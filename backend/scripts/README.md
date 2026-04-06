# PrüfPilot Backup & Restore Scripts

This directory contains automated backup and restore scripts for the PrüfPilot PostgreSQL database.

## Scripts

### backup.sh
Creates compressed backups of the PostgreSQL database.

**Features:**
- Automated timestamped backups (gzip compressed)
- Automatic cleanup of old backups (retention policy)
- Optional S3 remote backup support
- Backup integrity verification
- Detailed logging

**Usage:**
```bash
# Basic backup using defaults
./backup.sh

# Backup with custom directory
BACKUP_DIR=/mnt/secure-backups ./backup.sh

# Backup with S3 upload
AWS_S3_BUCKET=my-company-backups AWS_REGION=eu-central-1 ./backup.sh
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (default: postgresql://pruefpilot:pruefpilot@localhost:5432/pruefpilot)
- `BACKUP_DIR` - Where to store backups (default: ./backups)
- `BACKUP_RETENTION_DAYS` - Keep backups for N days (default: 30)
- `AWS_S3_BUCKET` - S3 bucket for remote backups (optional)
- `AWS_REGION` - AWS region for S3 (default: eu-central-1)

### restore.sh
Restores a database from a backup file.

**Features:**
- Automatic safety backup before restore
- Session disconnection handling
- Atomic restore operations
- Post-restore verification

**Usage:**
```bash
# List available backups
./restore.sh list

# Restore latest backup
./restore.sh latest

# Restore specific backup
./restore.sh ./backups/pruefpilot_backup_20240406_020000.sql.gz
```

**⚠️ WARNING:** This script will DELETE your current database and replace it with the backup. Always verify the backup before restoring in production.

## Setup Instructions

### 1. Prerequisites
- PostgreSQL client tools installed (`pg_dump`, `psql`)
- Database connection with CREATE/DROP DATABASE privileges
- Sufficient disk space for backups

### 2. Configuration

**Option A: Environment Variables**
```bash
# Create a .env file
cat > .env.backup << 'EOF'
DATABASE_URL=postgresql://pruefpilot:secure_password@db.example.com:5432/pruefpilot
BACKUP_DIR=/mnt/backups/pruefpilot
BACKUP_RETENTION_DAYS=30
AWS_S3_BUCKET=company-backups
AWS_REGION=eu-central-1
EOF

# Load before running scripts
source .env.backup
./backup.sh
```

**Option B: Hardcode in Script**
Edit the script's Configuration section directly.

### 3. Automated Daily Backups with Cron

**Create a cron job:**
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /app && source .env.backup && ./scripts/backup.sh >> /var/log/pruefpilot-backup.log 2>&1

# Send email on failure (optional)
0 2 * * * cd /app && source .env.backup && ./scripts/backup.sh || mail -s "PrüfPilot backup failed" admin@example.com
```

### 4. AWS S3 Setup (Optional)

**Install AWS CLI:**
```bash
pip install awscli
# or
brew install awscli
```

**Configure credentials:**
```bash
aws configure
# Enter AWS Access Key ID, Secret Access Key, Region, Output format
```

**Create S3 bucket:**
```bash
aws s3 mb s3://company-backups --region eu-central-1
aws s3api put-bucket-versioning --bucket company-backups --versioning-configuration Status=Enabled
aws s3api put-bucket-server-side-encryption-configuration --bucket company-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Testing

### Test Backup Creation
```bash
./backup.sh
ls -lh ./backups/
```

### Test Restore Procedure (on staging server)
```bash
# Create test backup
DATABASE_URL=postgresql://test:test@localhost:5432/staging_db ./backup.sh

# Restore it
./restore.sh latest
# Type: RESTORE at the prompt
```

### Test S3 Upload
```bash
AWS_S3_BUCKET=test-bucket ./backup.sh
aws s3 ls s3://test-bucket/pruefpilot-backups/
```

## Monitoring & Alerts

### Log File Monitoring
```bash
# Watch backup logs in real-time
tail -f /var/log/pruefpilot-backup.log

# Check backup status
ls -lhS ./backups/*.sql.gz | head -5

# Verify all backups
for f in ./backups/*.sql.gz; do
  echo -n "$f: "
  gunzip -t "$f" && echo "OK" || echo "CORRUPTED"
done
```

### Backup Size Monitoring
```bash
# Total backup storage used
du -sh ./backups/

# Largest backups
ls -lhS ./backups/*.sql.gz | head -10
```

## Disaster Recovery Procedure

**For Production Database Loss:**

1. **Verify Connection:**
   ```bash
   psql -h db.example.com -U pruefpilot -d postgres -c "SELECT version();"
   ```

2. **List Available Backups:**
   ```bash
   ./restore.sh list
   ```

3. **Choose Backup (Usually Latest):**
   ```bash
   ./restore.sh latest
   ```

4. **Type RESTORE when prompted** - This will create a safety backup automatically

5. **Verify Data Integrity:**
   ```bash
   psql -h db.example.com -U pruefpilot -d pruefpilot -c "SELECT COUNT(*) FROM users;"
   psql -h db.example.com -U pruefpilot -d pruefpilot -c "SELECT COUNT(*) FROM arbeitsmittel;"
   ```

6. **If Something Goes Wrong:**
   - A safety backup was created before the restore
   - See the restore log for the backup filename
   - Run restore again with the safety backup

## Backup Retention Policy

By default, backups older than 30 days are automatically deleted. Adjust with:
```bash
BACKUP_RETENTION_DAYS=90 ./backup.sh  # Keep for 90 days
```

## Performance Considerations

- **Backup Duration:** Typical ~5-15 minutes depending on database size
- **Storage Impact:** Compressed backups typically use 15-30% of database size
- **Network (S3):** Upload speed depends on internet connection and database size

## Security Best Practices

1. **Encrypt Backups:**
   - Use `--sse AES256` for S3 (already configured)
   - Store local backups on encrypted filesystem

2. **Access Control:**
   - Restrict backup directory permissions: `chmod 700 ./backups`
   - Use database user with minimal privileges for backups
   - Use AWS IAM roles instead of hardcoded credentials

3. **Off-site Backups:**
   - Always upload to S3 or other remote location
   - Test restore from remote backups regularly

4. **Documentation:**
   - Keep backup recovery procedures documented
   - Document all environment variables used
   - Train team members on restore process

## Troubleshooting

### "Could not parse DATABASE_URL"
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Check for special characters in password (use URL encoding if needed)

### "pg_dump: command not found"
- Install PostgreSQL client: `apt-get install postgresql-client` (Ubuntu/Debian)
- Or `brew install postgresql` (macOS)

### "Backup integrity check FAILED"
- Backup file is corrupted - restore from previous backup
- Check disk space during backup
- Check PostgreSQL server logs

### "Restore FAILED - permission denied"
- Verify database user has CREATE/DROP DATABASE privileges
- On RDS: User must be part of rds_superuser role

### S3 Upload Fails
- Verify AWS credentials: `aws sts get-caller-identity`
- Verify S3 bucket exists and user has PutObject permission
- Check internet connection and AWS region

## Support

For issues or questions:
1. Check backup/restore logs
2. Verify environment variables
3. Test on staging environment first
4. Contact infrastructure team with logs
