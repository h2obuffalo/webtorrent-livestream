# Deployment Checklist Rule

**CRITICAL**: Before considering any change complete, verify all affected routes and services are updated.

---

## 🔄 **When Making Changes - ALWAYS Check:**

### 1. **File Changes Requiring Docker Restart**
If you modify any of these files, **MUST rebuild Docker containers**:
- `broadcaster/*.js` (server.js, manifest-generator.js, etc.)
- `broadcaster/package.json`
- `broadcaster/Dockerfile`
- `signaling/*.js`
- `docker-compose.yml`

**Commands:**
```bash
# Rebuild and restart affected services
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# Or rebuild all if unsure
docker compose build --no-cache
docker compose up -d
```

### 2. **Static File Changes Requiring Cache Clear**
If you modify any of these files, **MUST clear caches**:
- `viewer/public/lib/*.js` (P2P media loader files)
- `viewer/public/*.html` (HTML pages)
- `viewer/public/*.css` (Stylesheets)
- Any files served by web server

**Commands:**
```bash
# Update all copies of the file
find . -name "filename" -exec sed -i 'changes' {} \;

# Force cache invalidation by updating timestamps
touch filename
echo "// Updated $(date)" >> filename

# Verify changes are served (not cached)
curl -s https://domain.com/path/to/file | tail -5
```

### 3. **Multiple File Locations**
Some files exist in multiple locations. **MUST update ALL copies**:
- `viewer/lib/` (development)
- `viewer/public/lib/` (production)
- `viewer/dist/lib/` (build output)
- `node_modules/` (dependencies - usually don't modify)

**Command to find all copies:**
```bash
find . -name "filename" -exec ls -la {} \;
```

---

## 🧪 **Verification Checklist**

### After ANY Change, Verify:

#### ✅ **Docker Services**
```bash
# Check if services are running
docker compose ps

# Check logs for errors
docker compose logs <service> --tail 20

# Verify new code is active
docker compose logs <service> | grep "expected-log-message"
```

#### ✅ **Static Files**
```bash
# Check if changes are served (not cached)
curl -s https://domain.com/path/to/file | grep "expected-content"

# Check for source map errors
curl -s https://domain.com/page.html | grep -o "sourceMappingURL" | wc -l
# Should be 0 for production files
```

#### ✅ **API Endpoints**
```bash
# Test API responses
curl -s https://domain.com/api/endpoint | jq .

# Check manifest generation
curl -s https://domain.com/live/playlist.m3u8 | head -10
```

#### ✅ **Browser Testing**
- Open browser console
- Check for JavaScript errors
- Verify functionality works
- Test on multiple browsers/devices

---

## 🚨 **Common Cache Issues**

### **Cloudflare Cache**
- Files served with `cache-control: max-age=14400` (4 hours)
- **Solution**: 
  - **Development**: Enable Cloudflare Developer Mode (bypasses cache)
  - **Production**: Update file timestamps or add version parameters
  - **Emergency**: Purge Cloudflare cache manually

### **Docker Layer Cache**
- Docker caches layers, may not pick up file changes
- **Solution**: Use `--no-cache` flag when rebuilding

### **Browser Cache**
- Browsers cache static files aggressively
- **Solution**: Hard refresh (Ctrl+F5) or incognito mode

### **CDN Cache**
- Cloudflare/other CDNs cache responses
- **Solution**: Purge cache or wait for TTL expiration

---

## 📋 **Pre-Deployment Checklist**

Before marking any change as complete:

- [ ] **Code Changes**: All affected files updated
- [ ] **Docker Services**: Rebuilt and restarted if needed
- [ ] **Static Files**: All copies updated, cache cleared
- [ ] **API Endpoints**: Tested and working
- [ ] **Browser Testing**: No console errors, functionality works
- [ ] **Multiple Browsers**: Tested on Chrome, Firefox, Safari
- [ ] **Mobile Testing**: Tested on mobile devices
- [ ] **Performance**: No regressions introduced

---

## 🔧 **Quick Commands Reference**

### **Full System Restart**
```bash
# Rebuild all services
docker compose build --no-cache
docker compose up -d

# Clear all caches
find . -name "*.js" -path "*/public/*" -exec touch {} \;
```

### **Check System Status**
```bash
# Services
docker compose ps

# Logs
docker compose logs --tail 50

# File versions
find . -name "filename" -exec ls -la {} \;

# API health
curl -s https://domain.com/health | jq .
```

### **Emergency Cache Clear**
```bash
# Force update all static files
find . -name "*.js" -path "*/public/*" -exec sh -c 'echo "// Updated $(date)" >> "$1"' _ {} \;

# Rebuild Docker
docker compose build --no-cache
docker compose up -d

# Cloudflare Developer Mode (if enabled)
# - Automatically bypasses cache for 3 hours
# - No additional commands needed
```

### **Automatic Deployment Process**
**CRITICAL**: Always deploy changes immediately after making them:

```bash
# 1. Deploy files to EC2
scp -i ~/.ssh/bangfacetv.pem file1 file2 ubuntu@3.10.164.179:~/webtorrent-livestream/path/

# 2. Rebuild Docker if needed
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && docker compose build --no-cache broadcaster && docker compose up -d broadcaster"

# 3. Verify deployment
curl -s https://domain.com/path/to/file | grep "expected-content"
```

### **Cloudflare Developer Mode**
- **Enable**: Cloudflare Dashboard → Caching → Configuration → Developer Mode
- **Duration**: 3 hours of cache bypass
- **Benefit**: Instant updates during development
- **Note**: Remember to disable before production deployment

---

## ⚠️ **Critical Reminders**

1. **ALWAYS DEPLOY CHANGES IMMEDIATELY** - Never leave changes only on local machine
2. **Docker containers don't automatically pick up file changes**
3. **Multiple copies of files exist in different directories**
4. **Caches (Cloudflare, browser, Docker) can serve old versions**
5. **Always verify changes are actually deployed, not just saved**
6. **Test on multiple browsers/devices to catch cache issues**

## 🚨 **MANDATORY DEPLOYMENT CHECKLIST**

**Before marking ANY change as complete:**

- [ ] **Files deployed to EC2** - Use `scp` to copy files
- [ ] **Docker rebuilt** - If code changes, rebuild containers
- [ ] **Changes verified** - Check live site shows new content
- [ ] **Cache cleared** - Force refresh or wait for TTL
- [ ] **Multiple browsers tested** - Chrome, Firefox, Safari

---

## 🎯 **Success Criteria**

A change is only complete when:
- ✅ All affected services are running the new code
- ✅ All static files are serving the updated content
- ✅ No console errors in browser
- ✅ Functionality works as expected
- ✅ Tested on multiple browsers/devices

**Remember**: "It works on my machine" ≠ "It's deployed correctly"
