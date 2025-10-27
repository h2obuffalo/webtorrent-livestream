# ⚠️ ACTION REQUIRED: Deploy Stream Restart Detection

## What I've Done (Locally)

✅ Implemented automatic stream restart detection
✅ Added unique session IDs for each stream  
✅ Reduced cache durations to prevent stale chunks
✅ Created deployment scripts and documentation
✅ Committed all changes to git (2 commits ready to push)

## What You Need to Do

### Step 1: Push to GitHub (REQUIRED)

The code is committed locally but **not yet pushed** to GitHub. You need to push it:

```bash
# You're already in the project directory
git push origin feature/p2p-optimization
```

**If you get authentication errors**, you have two options:

**Option A: GitHub CLI (easiest)**
```bash
# Install if needed: brew install gh
gh auth login
git push origin feature/p2p-optimization
```

**Option B: Personal Access Token**
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic) with `repo` scope
3. Copy the token
4. When you run `git push`, use the token as your password

### Step 2: Deploy to EC2

Once pushed, SSH to your EC2 server and run:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/webtorrent-livestream
git pull origin feature/p2p-optimization
bash deploy/deploy-restart-fix.sh
```

The deployment script will automatically:
- Pull latest code
- Rebuild broadcaster container (Docker) or update deps (PM2)
- Restart broadcaster service
- Show you logs and status

### Step 3: Test It

After deployment, test stream restart:
1. Start OBS stream
2. Stop OBS after 1-2 minutes
3. Wait 35 seconds
4. Check EC2 logs: `docker compose logs broadcaster | grep "Stream restart"`
5. Start OBS again
6. Verify viewers see new stream (not old one)

## Files Ready to Push

```
modified:   broadcaster/server.js              (restart detection logic)
modified:   broadcaster/r2-uploader.js         (reduced cache durations)
new file:   STREAM-RESTART-FIX.md              (technical docs)
new file:   QUICK-RESTART-GUIDE.md             (user guide)
new file:   DEPLOY-TO-EC2.md                   (deployment instructions)
new file:   deploy/deploy-restart-fix.sh       (automated deployment)
```

## What This Solves

❌ **Before:** Viewers stuck on last frame of old stream after OBS restart
✅ **After:** Automatic restart detection, fresh stream within 10-30 seconds

## Quick Reference

- **Full deployment guide:** `DEPLOY-TO-EC2.md`
- **Technical details:** `STREAM-RESTART-FIX.md`
- **User-friendly guide:** `QUICK-RESTART-GUIDE.md`

## TL;DR

```bash
# Step 1: Push (on your Mac)
git push origin feature/p2p-optimization

# Step 2: Deploy (on EC2)
ssh ubuntu@your-ec2-ip
cd ~/webtorrent-livestream
git pull origin feature/p2p-optimization
bash deploy/deploy-restart-fix.sh
```

---

**That's it!** Once deployed, your stream restart issue will be resolved. 🎉

