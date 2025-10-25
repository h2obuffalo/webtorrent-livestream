#!/bin/bash
# Deploy stream restart detection fix to AWS EC2
# Run this script on your EC2 instance

set -e  # Exit on error

echo "🚀 Deploying Stream Restart Detection Update..."
echo ""

# Navigate to project directory
cd ~/webtorrent-livestream || cd /home/ubuntu/webtorrent-livestream || {
    echo "❌ Error: webtorrent-livestream directory not found"
    exit 1
}

echo "📍 Working directory: $(pwd)"
echo ""

# Show current branch and status
echo "📋 Current git status:"
git branch
git status
echo ""

# Pull latest changes
echo "⬇️  Pulling latest changes from GitHub..."
git fetch origin
git pull origin feature/p2p-optimization
echo "✅ Code updated"
echo ""

# Check if using Docker or PM2
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Detected Docker setup"
    echo ""
    
    # Rebuild broadcaster container
    echo "🔨 Rebuilding broadcaster container..."
    docker compose build broadcaster
    echo "✅ Build complete"
    echo ""
    
    # Restart broadcaster
    echo "♻️  Restarting broadcaster service..."
    docker compose up -d --force-recreate broadcaster
    echo "✅ Broadcaster restarted"
    echo ""
    
    # Show status
    echo "📊 Container status:"
    docker compose ps
    echo ""
    
    # Show recent logs
    echo "📜 Recent logs (last 30 lines):"
    docker compose logs --tail=30 broadcaster
    
elif command -v pm2 &> /dev/null; then
    echo "⚙️  Detected PM2 setup"
    echo ""
    
    # Install/update dependencies
    echo "📦 Updating dependencies..."
    cd broadcaster
    npm install
    cd ..
    echo "✅ Dependencies updated"
    echo ""
    
    # Restart broadcaster with PM2
    echo "♻️  Restarting broadcaster service..."
    pm2 restart broadcaster
    echo "✅ Broadcaster restarted"
    echo ""
    
    # Show status
    echo "📊 PM2 status:"
    pm2 status
    echo ""
    
    # Show recent logs
    echo "📜 Recent logs:"
    pm2 logs broadcaster --lines 30 --nostream
    
else
    echo "⚠️  Warning: Neither Docker nor PM2 detected"
    echo "Please manually restart the broadcaster service"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing endpoints..."
echo ""

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Health endpoint responding"
    curl -s http://localhost:3000/health | python3 -m json.tool || curl -s http://localhost:3000/health
else
    echo "❌ Health endpoint not responding"
fi

echo ""
echo "📖 For more information:"
echo "   - View logs: docker compose logs -f broadcaster  (or: pm2 logs broadcaster)"
echo "   - Check status: docker compose ps  (or: pm2 status)"
echo "   - Read guide: cat QUICK-RESTART-GUIDE.md"
echo ""
echo "✨ Stream restart detection is now active!"
echo "   - Automatic detection after 30s timeout"
echo "   - Segment-based restart detection"
echo "   - Unique session IDs per stream"
echo "   - Reduced cache durations (10s)"
echo ""

