#!/bin/bash

# Backup and Restore Script for Shipping Tracker
# Handles automated backups and disaster recovery

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
S3_BUCKET="${S3_BUCKET:-shipping-tracker-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
backup_database() {
    log_info "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/database_backup_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Extract database connection info
    local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    local db_password=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    # Create database backup
    PGPASSWORD="$db_password" pg_dump \
        -h "$db_host" \
        -p "$db_port" \
        -U "$db_user" \
        -d "$db_name" \
        --verbose \
        --no-owner \
        --no-privileges \
        --create \
        --clean \
        > "$backup_file" || {
        log_error "Database backup failed"
        return 1
    }
    
    # Compress backup
    gzip "$backup_file"
    
    # Encrypt if key is provided
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "${compressed_file}.enc" -k "$ENCRYPTION_KEY"
        rm "$compressed_file"
        compressed_file="${compressed_file}.enc"
    fi
    
    log_success "Database backup created: $(basename "$compressed_file")"
    echo "$compressed_file"
}

# Redis backup
backup_redis() {
    log_info "Creating Redis backup..."
    
    local backup_file="$BACKUP_DIR/redis_backup_${TIMESTAMP}.rdb"
    local compressed_file="${backup_file}.gz"
    
    # Get Redis connection info
    local redis_host=$(echo $REDIS_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local redis_port=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\).*/\1/p')
    local redis_password=$(echo $REDIS_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    # Create Redis backup using BGSAVE
    if [[ -n "$redis_password" ]]; then
        redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" BGSAVE
    else
        redis-cli -h "$redis_host" -p "$redis_port" BGSAVE
    fi
    
    # Wait for backup to complete
    while true; do
        if [[ -n "$redis_password" ]]; then
            result=$(redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" LASTSAVE)
        else
            result=$(redis-cli -h "$redis_host" -p "$redis_port" LASTSAVE)
        fi
        
        if [[ "$result" != "$last_save" ]]; then
            break
        fi
        sleep 1
    done
    
    # Copy RDB file
    if [[ -n "$redis_password" ]]; then
        redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" --rdb "$backup_file"
    else
        redis-cli -h "$redis_host" -p "$redis_port" --rdb "$backup_file"
    fi
    
    # Compress backup
    gzip "$backup_file"
    
    # Encrypt if key is provided
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "${compressed_file}.enc" -k "$ENCRYPTION_KEY"
        rm "$compressed_file"
        compressed_file="${compressed_file}.enc"
    fi
    
    log_success "Redis backup created: $(basename "$compressed_file")"
    echo "$compressed_file"
}

# Application files backup
backup_application() {
    log_info "Creating application backup..."
    
    local backup_file="$BACKUP_DIR/application_backup_${TIMESTAMP}.tar.gz"
    
    cd "$PROJECT_ROOT"
    
    # Create tar archive excluding unnecessary files
    tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='backups' \
        --exclude='*.log' \
        --exclude='.env*' \
        . || {
        log_error "Application backup failed"
        return 1
    }
    
    # Encrypt if key is provided
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
        rm "$backup_file"
        backup_file="${backup_file}.enc"
    fi
    
    log_success "Application backup created: $(basename "$backup_file")"
    echo "$backup_file"
}

# Configuration backup
backup_configuration() {
    log_info "Creating configuration backup..."
    
    local backup_file="$BACKUP_DIR/config_backup_${TIMESTAMP}.tar.gz"
    
    # Create temporary directory for config files
    local temp_dir=$(mktemp -d)
    
    # Copy configuration files
    cp "$PROJECT_ROOT/.env.production" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docker-compose.production.yml" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_ROOT/nginx.conf" "$temp_dir/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/.kiro" "$temp_dir/" 2>/dev/null || true
    
    # Copy system configuration files (if accessible)
    if [[ -f "/etc/nginx/sites-available/shipping-tracker" ]]; then
        mkdir -p "$temp_dir/nginx"
        cp "/etc/nginx/sites-available/shipping-tracker" "$temp_dir/nginx/"
    fi
    
    # Create archive
    cd "$temp_dir"
    tar -czf "$backup_file" . || {
        log_error "Configuration backup failed"
        rm -rf "$temp_dir"
        return 1
    }
    
    # Cleanup
    rm -rf "$temp_dir"
    
    # Encrypt if key is provided
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
        rm "$backup_file"
        backup_file="${backup_file}.enc"
    fi
    
    log_success "Configuration backup created: $(basename "$backup_file")"
    echo "$backup_file"
}

# Upload to S3
upload_to_s3() {
    local file="$1"
    local s3_key="$(basename "$file")"
    
    if command -v aws >/dev/null 2>&1; then
        log_info "Uploading to S3: $s3_key"
        aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" || {
            log_warning "S3 upload failed for $s3_key"
            return 1
        }
        log_success "Uploaded to S3: $s3_key"
    else
        log_warning "AWS CLI not found, skipping S3 upload"
    fi
}

# Full backup
full_backup() {
    log_info "Starting full backup..."
    
    local backup_manifest="$BACKUP_DIR/backup_manifest_${TIMESTAMP}.json"
    local backup_files=()
    
    # Create backup manifest
    cat > "$backup_manifest" << EOF
{
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "type": "full_backup",
    "files": []
}
EOF
    
    # Database backup
    if db_backup=$(backup_database); then
        backup_files+=("$db_backup")
        upload_to_s3 "$db_backup"
    fi
    
    # Redis backup
    if redis_backup=$(backup_redis); then
        backup_files+=("$redis_backup")
        upload_to_s3 "$redis_backup"
    fi
    
    # Application backup
    if app_backup=$(backup_application); then
        backup_files+=("$app_backup")
        upload_to_s3 "$app_backup"
    fi
    
    # Configuration backup
    if config_backup=$(backup_configuration); then
        backup_files+=("$config_backup")
        upload_to_s3 "$config_backup"
    fi
    
    # Update manifest with file list
    local files_json=""
    for file in "${backup_files[@]}"; do
        if [[ -n "$files_json" ]]; then
            files_json+=","
        fi
        files_json+="\"$(basename "$file")\""
    done
    
    # Update manifest
    cat > "$backup_manifest" << EOF
{
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "type": "full_backup",
    "files": [$files_json],
    "total_files": ${#backup_files[@]},
    "backup_size": "$(du -sh "$BACKUP_DIR" | cut -f1)"
}
EOF
    
    upload_to_s3 "$backup_manifest"
    
    log_success "Full backup completed. Files: ${#backup_files[@]}"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Restoring database from: $(basename "$backup_file")"
    
    # Decrypt if needed
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "$ENCRYPTION_KEY" ]]; then
            log_error "Encryption key required for encrypted backup"
            return 1
        fi
        
        restore_file="${backup_file%.enc}"
        openssl enc -aes-256-cbc -d -in "$backup_file" -out "$restore_file" -k "$ENCRYPTION_KEY" || {
            log_error "Failed to decrypt backup file"
            return 1
        }
    fi
    
    # Decompress if needed
    if [[ "$restore_file" == *.gz ]]; then
        gunzip -c "$restore_file" > "${restore_file%.gz}"
        restore_file="${restore_file%.gz}"
    fi
    
    # Extract database connection info
    local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    local db_password=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    # Restore database
    PGPASSWORD="$db_password" psql \
        -h "$db_host" \
        -p "$db_port" \
        -U "$db_user" \
        -d "$db_name" \
        -f "$restore_file" || {
        log_error "Database restore failed"
        return 1
    }
    
    log_success "Database restored successfully"
}

# Restore Redis
restore_redis() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Restoring Redis from: $(basename "$backup_file")"
    
    # Decrypt if needed
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "$ENCRYPTION_KEY" ]]; then
            log_error "Encryption key required for encrypted backup"
            return 1
        fi
        
        restore_file="${backup_file%.enc}"
        openssl enc -aes-256-cbc -d -in "$backup_file" -out "$restore_file" -k "$ENCRYPTION_KEY" || {
            log_error "Failed to decrypt backup file"
            return 1
        }
    fi
    
    # Decompress if needed
    if [[ "$restore_file" == *.gz ]]; then
        gunzip -c "$restore_file" > "${restore_file%.gz}"
        restore_file="${restore_file%.gz}"
    fi
    
    # Get Redis connection info
    local redis_host=$(echo $REDIS_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local redis_port=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\).*/\1/p')
    local redis_password=$(echo $REDIS_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    # Stop Redis temporarily and replace RDB file
    # This would require Redis to be stopped and the RDB file replaced
    log_warning "Redis restore requires manual intervention to replace RDB file"
    log_info "Restored RDB file location: $restore_file"
    
    log_success "Redis restore prepared"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "*backup*" -type f -mtime +$RETENTION_DAYS -delete
    
    # Cleanup S3 backups if AWS CLI is available
    if command -v aws >/dev/null 2>&1; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}' | tr -d '-')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$file_name"
                log_info "Deleted old S3 backup: $file_name"
            fi
        done
    fi
    
    log_success "Cleanup completed"
}

# List available backups
list_backups() {
    log_info "Available local backups:"
    
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -la "$BACKUP_DIR"/*backup* 2>/dev/null | while read -r line; do
            echo "  $line"
        done
    else
        log_info "No local backups found"
    fi
    
    if command -v aws >/dev/null 2>&1; then
        log_info "Available S3 backups:"
        aws s3 ls "s3://$S3_BUCKET/" | grep backup
    fi
}

# Download backup from S3
download_from_s3() {
    local s3_key="$1"
    local local_file="$BACKUP_DIR/$s3_key"
    
    if command -v aws >/dev/null 2>&1; then
        log_info "Downloading from S3: $s3_key"
        aws s3 cp "s3://$S3_BUCKET/$s3_key" "$local_file" || {
            log_error "Failed to download from S3: $s3_key"
            return 1
        }
        log_success "Downloaded: $local_file"
        echo "$local_file"
    else
        log_error "AWS CLI not found"
        return 1
    fi
}

# Disaster recovery
disaster_recovery() {
    local backup_timestamp="$1"
    
    if [[ -z "$backup_timestamp" ]]; then
        log_error "Backup timestamp required for disaster recovery"
        log_info "Usage: $0 disaster-recovery YYYYMMDD_HHMMSS"
        return 1
    fi
    
    log_info "Starting disaster recovery for backup: $backup_timestamp"
    
    # Download backups from S3 if not available locally
    local db_backup="$BACKUP_DIR/database_backup_${backup_timestamp}.sql.gz"
    local redis_backup="$BACKUP_DIR/redis_backup_${backup_timestamp}.rdb.gz"
    local app_backup="$BACKUP_DIR/application_backup_${backup_timestamp}.tar.gz"
    local config_backup="$BACKUP_DIR/config_backup_${backup_timestamp}.tar.gz"
    
    # Add .enc extension if encryption is enabled
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        db_backup="${db_backup}.enc"
        redis_backup="${redis_backup}.enc"
        app_backup="${app_backup}.enc"
        config_backup="${config_backup}.enc"
    fi
    
    # Download missing backups
    for backup_file in "$db_backup" "$redis_backup" "$app_backup" "$config_backup"; do
        if [[ ! -f "$backup_file" ]]; then
            download_from_s3 "$(basename "$backup_file")" || {
                log_warning "Could not download: $(basename "$backup_file")"
            }
        fi
    done
    
    # Restore database
    if [[ -f "$db_backup" ]]; then
        restore_database "$db_backup"
    else
        log_warning "Database backup not found: $db_backup"
    fi
    
    # Restore Redis
    if [[ -f "$redis_backup" ]]; then
        restore_redis "$redis_backup"
    else
        log_warning "Redis backup not found: $redis_backup"
    fi
    
    # Restore application (if needed)
    if [[ -f "$app_backup" ]]; then
        log_info "Application backup available: $app_backup"
        log_info "Manual restoration may be required"
    fi
    
    # Restore configuration (if needed)
    if [[ -f "$config_backup" ]]; then
        log_info "Configuration backup available: $config_backup"
        log_info "Manual restoration may be required"
    fi
    
    log_success "Disaster recovery completed"
}

# Main function
main() {
    case "${1:-backup}" in
        "backup")
            full_backup
            cleanup_old_backups
            ;;
        "restore-db")
            restore_database "$2"
            ;;
        "restore-redis")
            restore_redis "$2"
            ;;
        "disaster-recovery")
            disaster_recovery "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "download")
            download_from_s3 "$2"
            ;;
        *)
            echo "Usage: $0 {backup|restore-db|restore-redis|disaster-recovery|list|cleanup|download}"
            echo ""
            echo "Commands:"
            echo "  backup                    - Create full backup"
            echo "  restore-db <file>         - Restore database from backup file"
            echo "  restore-redis <file>      - Restore Redis from backup file"
            echo "  disaster-recovery <timestamp> - Full disaster recovery"
            echo "  list                      - List available backups"
            echo "  cleanup                   - Remove old backups"
            echo "  download <s3-key>         - Download backup from S3"
            exit 1
            ;;
    esac
}

main "$@"