#!/bin/bash

# Auto-cleanup script for EC2 storage management
# Cleans up Owncast offline videos, Docker cache, and old logs

set -e

LOG_FILE="/var/log/storage-cleanup.log"
OWNCAST_DATA="/home/ubuntu/owncast/data"
MAX_OFFLINE_FILES=5  # Keep only 5 most recent offline videos
MAX_AGE_DAYS=7        # Remove files older than 7 days

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🧹 Starting storage cleanup..."

# 1. Clean up Owncast offline videos (keep only recent ones)
log "📹 Cleaning up Owncast offline videos..."
OFFLINE_COUNT=$(find "$OWNCAST_DATA/tmp" -name "offline-v2.ts*" 2>/dev/null | wc -l)
if [ "$OFFLINE_COUNT" -gt "$MAX_OFFLINE_FILES" ]; then
    # Keep only the 5 most recent files
    find "$OWNCAST_DATA/tmp" -name "offline-v2.ts*" -type f -printf '%T@ %p\n' | \
        sort -n | head -n -$MAX_OFFLINE_FILES | cut -d' ' -f2- | xargs rm -f
    log "✅ Removed $((OFFLINE_COUNT - MAX_OFFLINE_FILES)) old offline videos"
else
    log "ℹ️  Only $OFFLINE_COUNT offline videos found (keeping all)"
fi

# 2. Clean up old HLS segments (older than 1 hour)
log "🎬 Cleaning up old HLS segments..."
OLD_SEGMENTS=$(find "$OWNCAST_DATA/hls" -name "*.ts" -mmin +60 2>/dev/null | wc -l)
if [ "$OLD_SEGMENTS" -gt 0 ]; then
    find "$OWNCAST_DATA/hls" -name "*.ts" -mmin +60 -delete
    log "✅ Removed $OLD_SEGMENTS old HLS segments"
else
    log "ℹ️  No old HLS segments to clean"
fi

# 3. Clean up old metrics data
log "📊 Cleaning up old metrics..."
OLD_METRICS=$(find "$OWNCAST_DATA/metrics" -type d -mtime +$MAX_AGE_DAYS 2>/dev/null | wc -l)
if [ "$OLD_METRICS" -gt 0 ]; then
    find "$OWNCAST_DATA/metrics" -type d -mtime +$MAX_AGE_DAYS -exec rm -rf {} +
    log "✅ Removed $OLD_METRICS old metrics directories"
else
    log "ℹ️  No old metrics to clean"
fi

# 4. Clean up Docker system (images, containers, build cache)
log "🐳 Cleaning up Docker system..."
DOCKER_CLEANUP=$(docker system prune -a -f 2>&1 | grep "Total reclaimed space" | cut -d: -f2 | tr -d ' ')
if [ -n "$DOCKER_CLEANUP" ]; then
    log "✅ Docker cleanup reclaimed: $DOCKER_CLEANUP"
else
    log "ℹ️  No Docker cleanup needed"
fi

# 5. Clean up old log files
log "📝 Cleaning up old log files..."
OLD_LOGS=$(find /var/log -name "*.log.*" -mtime +$MAX_AGE_DAYS 2>/dev/null | wc -l)
if [ "$OLD_LOGS" -gt 0 ]; then
    find /var/log -name "*.log.*" -mtime +$MAX_AGE_DAYS -delete
    log "✅ Removed $OLD_LOGS old log files"
else
    log "ℹ️  No old log files to clean"
fi

# 6. Show current storage usage
log "📊 Current storage usage:"
df -h / | grep -E "(Filesystem|/dev/root)" | tee -a "$LOG_FILE"

# 7. Show Owncast data size
OWNCAST_SIZE=$(du -sh "$OWNCAST_DATA" 2>/dev/null | cut -f1)
log "📁 Owncast data size: $OWNCAST_SIZE"

log "✅ Storage cleanup completed successfully"

# Exit with success
exit 0
