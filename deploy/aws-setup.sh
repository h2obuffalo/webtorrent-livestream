#!/bin/bash
# AWS EC2 Setup Script for WebTorrent Live Streaming
# Run this on a fresh Ubuntu 22.04 instance

set -e

echo "🚀 WebTorrent Live Streaming - AWS Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install utilities
echo "📦 Installing utilities..."
sudo apt-get install -y htop curl wget jq nc

# Clone repository (update with your repo URL)
echo "📥 Cloning repository..."
if [ ! -d "webtorrent-livestream" ]; then
  read -p "Enter repository URL: " REPO_URL
  git clone $REPO_URL
  cd webtorrent-livestream
else
  cd webtorrent-livestream
  git pull
fi

# Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit .env with your credentials!"
  echo "   Run: nano .env"
  echo ""
  read -p "Press enter to open .env editor..." 
  nano .env
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check status
echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔗 Service URLs:"
echo "   Broadcaster: http://$(curl -s ifconfig.me):3000/health"
echo "   Metrics: http://$(curl -s ifconfig.me):3000/metrics"
echo ""

echo "📝 Next steps:"
echo "   1. Configure Owncast to output HLS segments"
echo "   2. Point OBS to this server's RTMP endpoint"
echo "   3. Open viewer at: https://tv.danpage.uk"
echo ""

echo "📋 Useful commands:"
echo "   docker-compose logs -f broadcaster  # View broadcaster logs"
echo "   docker-compose logs -f signaling    # View signaling logs"
echo "   docker-compose restart broadcaster  # Restart broadcaster"
echo "   docker-compose down                 # Stop all services"
echo "   docker-compose up -d                # Start all services"
echo ""

