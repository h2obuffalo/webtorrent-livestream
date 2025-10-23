# Docker Deployment Guide

## Quick Start

### 1. Prerequisites
```bash
# Install Docker & Docker Compose
docker --version
docker-compose --version
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Required variables:
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `CDN_HOSTNAME`

### 3. Build and Run

**Production:**
```bash
docker-compose up -d
```

**Development (with hot reload):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 4. Verify Services

```bash
# Check status
docker-compose ps

# Check logs
docker-compose logs -f broadcaster
docker-compose logs -f signaling

# Check health
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

---

## Service Endpoints

| Service | Port | Endpoint | Description |
|---------|------|----------|-------------|
| Broadcaster | 3000 | `/health` | Health check |
| Broadcaster | 3000 | `/metrics` | P2P metrics |
| Broadcaster | 3000 | `/chunks/*` | HLS segments |
| Signaling | 8080 | WebSocket | Peer signaling |

---

## Volume Management

### Owncast Data
By default, the broadcaster expects Owncast HLS output at:
```
./owncast/data/hls/0
```

To use a different path, update `.env`:
```bash
OWNCAST_DATA_PATH=/path/to/owncast/data/hls/0
```

### Logs
Logs are written to:
```
./logs/broadcaster/
./logs/signaling/
```

---

## Scaling

### Multiple Broadcasters
```bash
docker-compose up --scale broadcaster=3
```

### Resource Limits
Edit `docker-compose.yml`:
```yaml
services:
  broadcaster:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## AWS Deployment

### Using EC2 + Docker

```bash
# SSH into EC2 instance
ssh ubuntu@<ec2-ip>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Clone project
git clone <repo-url>
cd webtorrent-livestream

# Setup environment
cp .env.example .env
nano .env

# Start services
docker-compose up -d

# Enable auto-start on reboot
sudo systemctl enable docker
```

### Using ECS (Fargate)

1. **Build and push images:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t webtorrent-broadcaster ./broadcaster
docker tag webtorrent-broadcaster:latest <account>.dkr.ecr.us-east-1.amazonaws.com/webtorrent-broadcaster:latest

# Push
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/webtorrent-broadcaster:latest
```

2. **Create ECS task definition** using the pushed images

3. **Deploy to Fargate** with environment variables from `.env`

---

## Troubleshooting

### Broadcaster can't find Owncast files
```bash
# Check volume mount
docker-compose exec broadcaster ls -la /data/hls

# Verify Owncast path in .env
echo $OWNCAST_DATA_PATH
```

### Native module errors (wrtc)
The Docker build handles this automatically. If issues persist:
```bash
# Rebuild without cache
docker-compose build --no-cache broadcaster
```

### R2 connection fails
```bash
# Test R2 credentials
docker-compose exec broadcaster node -e "
const { verifyR2Connection } = require('./r2-uploader');
verifyR2Connection().then(() => console.log('OK')).catch(console.error);
"
```

### WebSocket connection fails
```bash
# Check signaling server
docker-compose logs signaling

# Test WebSocket
wscat -c ws://localhost:8080
```

---

## Monitoring

### Docker Stats
```bash
docker stats webtorrent-broadcaster webtorrent-signaling
```

### Health Checks
```bash
# Broadcaster health
curl http://localhost:3000/health

# Signaling health
nc -zv localhost 8080
```

### P2P Metrics
```bash
# Get real-time metrics
watch -n 5 'curl -s http://localhost:3000/metrics | jq'
```

---

## Backup & Recovery

### Backup Configuration
```bash
# Backup .env and docker-compose files
tar -czf webtorrent-config-$(date +%Y%m%d).tar.gz .env docker-compose*.yml
```

### Logs Rotation
Docker handles this automatically, but you can configure:
```yaml
services:
  broadcaster:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Production Checklist

- [ ] `.env` configured with production credentials
- [ ] Owncast data path correctly mounted
- [ ] Resource limits set for containers
- [ ] Health checks enabled
- [ ] Logs rotation configured
- [ ] Auto-restart policy set (`unless-stopped`)
- [ ] Firewall rules configured (ports 3000, 8080)
- [ ] HTTPS/SSL configured (via reverse proxy)
- [ ] Monitoring/alerting setup

---

## Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart a service
docker-compose restart broadcaster

# Execute command in container
docker-compose exec broadcaster sh

# Build images
docker-compose build

# Pull latest images
docker-compose pull

# Remove everything (including volumes)
docker-compose down -v
```

