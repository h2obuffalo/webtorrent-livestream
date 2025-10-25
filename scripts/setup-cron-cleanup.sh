#!/bin/bash

# Setup automatic storage cleanup via cron
# This script should be run on the EC2 server

set -e

SCRIPT_DIR="/home/ubuntu/webtorrent-livestream/scripts"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup-storage.sh"
CRON_JOB="0 */6 * * * $CLEANUP_SCRIPT >> /var/log/storage-cleanup.log 2>&1"

echo "🔧 Setting up automatic storage cleanup..."

# Make sure the cleanup script is executable
chmod +x "$CLEANUP_SCRIPT"

# Create log file with proper permissions
sudo touch /var/log/storage-cleanup.log
sudo chown ubuntu:ubuntu /var/log/storage-cleanup.log

# Add cron job (runs every 6 hours)
echo "📅 Adding cron job to run cleanup every 6 hours..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Show current cron jobs
echo "📋 Current cron jobs:"
crontab -l

echo "✅ Automatic cleanup setup complete!"
echo "   - Runs every 6 hours"
echo "   - Logs to /var/log/storage-cleanup.log"
echo "   - Keeps only 5 most recent offline videos"
echo "   - Removes files older than 7 days"
