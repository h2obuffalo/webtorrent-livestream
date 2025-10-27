#!/bin/bash
# EC2 Diagnostic Commands
# Copy and paste these commands one at a time into your terminal

# 1. Check Docker status
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "systemctl status docker"

# 2. Check containers
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker ps -a"

# 3. Check Owncast logs
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker logs owncast --tail 50"

# 4. Check disk space  
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "df -h"

# 5. Check Owncast API
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "curl http://localhost:8080/api/status"

# 6. Check if Owncast is running locally
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "ps aux | grep owncast"

# 7. Check Docker Compose services
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && docker compose ps"

# 8. Check Owncast container specifically
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker inspect owncast"

