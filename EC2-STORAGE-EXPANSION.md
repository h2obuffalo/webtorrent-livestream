# EC2 Storage Expansion Guide

## Current Status
- **Instance**: t2.micro (free tier eligible)
- **Current Disk**: 8GB (7GB used, 1GB free)
- **Memory**: 7.6GB RAM (excellent for streaming)
- **CPU**: Intel Xeon Platinum 8488C

## AWS Free Tier Limits
- **EBS Storage**: 30GB per month (free)
- **Instance**: t2.micro (750 hours/month free)
- **Data Transfer**: 1GB/month free

## Storage Expansion Options

### Option 1: Expand Current Volume (Recommended)
**Cost**: FREE (within 30GB limit)
**Steps**:
1. Go to AWS Console → EC2 → Volumes
2. Find your volume (should be 8GB)
3. Select volume → Actions → Modify Volume
4. Change size to 30GB
5. Apply changes (takes 1-2 minutes)

### Option 2: Add New Volume
**Cost**: FREE (within 30GB limit)
**Steps**:
1. Create new 22GB volume
2. Attach to instance
3. Mount and configure

## Recommended: Expand to 30GB

### Benefits:
- ✅ **22GB more space** (8GB → 30GB)
- ✅ **Still within free tier**
- ✅ **No downtime** (online expansion)
- ✅ **Better performance** (larger volumes are faster)

### After Expansion:
```
Current: 8GB (7GB used = 87% full)
After:   30GB (7GB used = 23% full)
Gain:    22GB free space
```

## Step-by-Step Expansion

### 1. AWS Console Steps:
1. **Login to AWS Console**
2. **Go to EC2 → Volumes**
3. **Find your volume** (8GB, attached to your instance)
4. **Select volume → Actions → Modify Volume**
5. **Change size to 30GB**
6. **Click "Modify"**
7. **Wait 1-2 minutes for completion**

### 2. Extend Filesystem (on EC2):
```bash
# Check current partition
lsblk

# Extend the partition
sudo growpart /dev/nvme0n1 1

# Resize filesystem
sudo resize2fs /dev/nvme0n1p1

# Verify expansion
df -h
```

## Expected Results After Expansion:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/root       30G   4.5G  25G   15% /
```

## Cost Analysis:
- **Current**: 8GB EBS = ~$0.80/month
- **After**: 30GB EBS = ~$3.00/month
- **Free Tier**: 30GB/month FREE
- **Net Cost**: $0 (within free tier!)

## Why This Helps Your Streaming:
1. **More HLS segments** can be cached locally
2. **Better performance** with more free space
3. **Room for logs** and temporary files
4. **Future-proof** for growth
5. **No storage anxiety** - plenty of headroom

## Alternative: Optimize Current 8GB
If you prefer to stay at 8GB:
- Remove unused packages: `sudo apt autoremove`
- Clean more aggressively: `sudo apt clean`
- Move logs to external storage
- Use R2 more heavily (already doing this)

## Recommendation: **EXPAND TO 30GB**
- ✅ **Free within AWS limits**
- ✅ **Massive improvement in headroom**
- ✅ **Better performance**
- ✅ **Future-proof**
- ✅ **No risk**

---

**Next Step**: Go to AWS Console and expand your volume to 30GB, then run the filesystem extension commands on EC2.
