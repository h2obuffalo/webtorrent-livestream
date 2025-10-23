# AWS Deployment Guide

## Infrastructure Overview

```
Internet → AWS ALB → EC2 (Docker) → Services
                                    ├─ Broadcaster (P2P seed)
                                    ├─ Signaling (WebSocket)
                                    └─ Owncast (HLS encoder)
                                    
                     ← Cloudflare R2 (CDN/Backup)
```

---

## Prerequisites

### AWS Account Setup
1. AWS account with billing enabled
2. IAM user with EC2, VPC, and ALB permissions
3. Key pair for SSH access
4. Security group configured (see below)

### Required AWS Resources
- **EC2 Instance**: t3.medium (2 vCPU, 4GB RAM minimum)
- **EBS Volume**: 50GB GP3 (for segments/logs)
- **Elastic IP**: For stable public IP
- **Security Group**: See security rules below

---

## Quick Deployment

### 1. Launch EC2 Instance

**Via AWS Console:**
```
AMI: Ubuntu Server 22.04 LTS
Instance Type: t3.medium
Storage: 50GB GP3
Security Group: (see below)
Key Pair: Select or create
```

**Via AWS CLI:**
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=webtorrent-broadcaster}]'
```

### 2. Configure Security Group

**Inbound Rules:**
```
Port 22 (SSH)      - Your IP only
Port 80 (HTTP)     - 0.0.0.0/0 (for ALB)
Port 443 (HTTPS)   - 0.0.0.0/0 (for ALB)
Port 1935 (RTMP)   - Your OBS IP (for streaming)
Port 3000 (HTTP)   - 0.0.0.0/0 (broadcaster API)
Port 8080 (WS)     - 0.0.0.0/0 (signaling)
```

**Outbound Rules:**
```
All traffic - 0.0.0.0/0 (for R2, trackers, etc)
```

### 3. Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<elastic-ip>

# Download and run setup script
curl -o setup.sh https://raw.githubusercontent.com/your-repo/main/deploy/aws-setup.sh
chmod +x setup.sh
./setup.sh
```

**Or manual setup:**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <your-repo-url>
cd webtorrent-livestream

# Setup environment
cp .env.example .env
nano .env  # Add your credentials

# Start services
docker-compose up -d
```

### 4. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f broadcaster

# Test health endpoint
curl http://localhost:3000/health

# Test from outside
curl http://<elastic-ip>:3000/health
```

---

## Environment Variables for AWS

Update `.env` with these AWS-specific values:

```bash
# Server Configuration
NODE_ENV=production
HTTP_PORT=3000
WS_PORT=8080

# Owncast Configuration (if running locally)
OWNCAST_DATA_PATH=/opt/owncast/data/hls/0

# Cloudflare R2 (from your .env)
CLOUDFLARE_ACCOUNT_ID=838041b6ff9cbae5a46f857ac4d9589c
R2_ACCESS_KEY_ID=26c042e0b8a299754cc026314bd76648
R2_SECRET_ACCESS_KEY=42f0d3b7485b82246ae523ff7f6629ca74339af39ab0fdf94ec3042895a53eba
R2_BUCKET_NAME=bangbucket
CDN_HOSTNAME=tv.danpage.uk

# Tracker URLs
TRACKER_URLS=wss://tracker.openwebtorrent.com,wss://tracker.webtorrent.dev,wss://tracker.fastcast.nz,wss://tracker.btorrent.xyz

# Retention
CHUNK_RETENTION_MINUTES=5

# Signaling (internal Docker network)
SIGNALING_URL=ws://signaling:8080

# Debug (enable for troubleshooting)
ENABLE_DEBUG_LOGGING=false
```

---

## Application Load Balancer (Optional but Recommended)

### Benefits
- SSL/TLS termination
- Health checks
- Auto-scaling support
- DDoS protection

### Setup

**1. Create Target Group:**
```bash
aws elbv2 create-target-group \
  --name webtorrent-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxxxxx \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2
```

**2. Create Load Balancer:**
```bash
aws elbv2 create-load-balancer \
  --name webtorrent-alb \
  --subnets subnet-xxxxxx subnet-yyyyyy \
  --security-groups sg-xxxxxxxxx \
  --scheme internet-facing \
  --type application
```

**3. Create Listener:**
```bash
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<certificate-arn> \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

---

## Auto-Scaling (Optional)

### Launch Template
```bash
aws ec2 create-launch-template \
  --launch-template-name webtorrent-template \
  --version-description "WebTorrent broadcaster" \
  --launch-template-data '{
    "ImageId": "ami-0c7217cdde317cfec",
    "InstanceType": "t3.medium",
    "KeyName": "your-key-pair",
    "SecurityGroupIds": ["sg-xxxxxxxxx"],
    "UserData": "<base64-encoded-startup-script>"
  }'
```

### Auto Scaling Group
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name webtorrent-asg \
  --launch-template LaunchTemplateName=webtorrent-template,Version=1 \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 1 \
  --vpc-zone-identifier "subnet-xxxxxx,subnet-yyyyyy" \
  --target-group-arns <target-group-arn> \
  --health-check-type ELB \
  --health-check-grace-period 300
```

---

## Monitoring

### CloudWatch Logs

**Install CloudWatch Agent:**
```bash
# Download and install
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
```

### CloudWatch Metrics

Monitor these metrics:
- CPU Utilization
- Network In/Out
- Disk I/O
- Custom: P2P connections, upload bandwidth

**Custom metric script:**
```bash
#!/bin/bash
# /opt/scripts/publish-metrics.sh

INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)

# Get P2P metrics from broadcaster
METRICS=$(curl -s http://localhost:3000/metrics)
PEERS=$(echo $METRICS | jq '.totalPeers')
UPLOADED=$(echo $METRICS | jq '.totalUploaded')

# Publish to CloudWatch
aws cloudwatch put-metric-data \
  --namespace "WebTorrent" \
  --metric-name "PeerCount" \
  --value $PEERS \
  --dimensions Instance=$INSTANCE_ID

aws cloudwatch put-metric-data \
  --namespace "WebTorrent" \
  --metric-name "TotalUploaded" \
  --value $UPLOADED \
  --dimensions Instance=$INSTANCE_ID
```

Add to crontab:
```bash
*/5 * * * * /opt/scripts/publish-metrics.sh
```

---

## Backup Strategy

### Database/Config Backup
```bash
# Backup .env and docker configs
aws s3 cp .env s3://your-backup-bucket/config/env-$(date +%Y%m%d)
aws s3 cp docker-compose.yml s3://your-backup-bucket/config/docker-compose-$(date +%Y%m%d).yml
```

### Snapshot EBS Volume
```bash
# Create snapshot
aws ec2 create-snapshot \
  --volume-id vol-xxxxxxxx \
  --description "WebTorrent backup $(date +%Y-%m-%d)"

# Automate with AWS Backup or cron
```

---

## Cost Estimation

**Monthly costs (US-East-1):**
```
t3.medium EC2 instance:    $30/month
50GB EBS GP3:              $4/month
Elastic IP (in use):       $0/month
Data Transfer Out (500GB): $45/month
ALB (if used):             $20/month
CloudWatch (basic):        $5/month
-------------------------------------------
Total (estimated):         $104/month
```

**For 1000 concurrent viewers:**
- Most traffic via P2P (free)
- R2 egress covers fallback
- Scale to t3.large if needed ($60/month)

---

## Troubleshooting

### Service won't start
```bash
# Check Docker logs
docker-compose logs broadcaster

# Check file permissions
ls -la /opt/owncast/data/hls/0

# Check environment
docker-compose config
```

### Can't connect to broadcaster
```bash
# Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxx

# Test from within instance
curl http://localhost:3000/health

# Test from outside
curl http://<elastic-ip>:3000/health
```

### High CPU usage
```bash
# Check container stats
docker stats

# Scale instance type
# Stop instance, change type to t3.large, start
```

---

## Production Checklist

- [ ] EC2 instance type appropriate for load
- [ ] Elastic IP attached
- [ ] Security group properly configured
- [ ] .env file with production credentials
- [ ] SSL certificate configured (via ALB or reverse proxy)
- [ ] CloudWatch monitoring enabled
- [ ] Backup strategy implemented
- [ ] Auto-scaling configured (optional)
- [ ] Load balancer health checks passing
- [ ] Docker set to auto-restart services
- [ ] System updates scheduled
- [ ] Logs rotation configured
- [ ] Firewall/iptables rules set

---

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Check metrics: `curl http://localhost:3000/metrics`
3. Check health: `curl http://localhost:3000/health`
4. Review CloudWatch logs
5. SSH into instance for debugging

