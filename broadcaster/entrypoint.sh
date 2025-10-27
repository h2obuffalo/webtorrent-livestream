#!/bin/sh
set -e

# Fix permissions on mounted volumes
# This ensures the nodejs user can read/write to the Owncast data directories
if [ -d "/data/hls" ]; then
    echo "Fixing permissions on /data/hls..."
    sudo chown -R nodejs:nodejs /data/hls 2>/dev/null || true
    sudo chmod -R 755 /data/hls 2>/dev/null || true
    
    # Fix permissions on any subdirectories
    for dir in /data/hls/*; do
        if [ -d "$dir" ]; then
            echo "Fixing permissions on $dir..."
            sudo chown -R nodejs:nodejs "$dir" 2>/dev/null || true
            sudo chmod -R 755 "$dir" 2>/dev/null || true
        fi
    done
    
    echo "Permissions fixed"
fi

# Use dumb-init to properly handle signals
exec /usr/bin/dumb-init -- "$@"
