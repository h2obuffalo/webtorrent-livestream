# Stream Restart Issue - Resolution

## Problem
After restarting an OBS stream, all viewer tabs and Android TV would continue playing the end of the previous stream, even after refreshing 2-5 minutes later. This was caused by:

1. **Persistent manifest state** - The manifest generator kept old chunks from the previous stream
2. **Old chunks in R2** - Previous stream chunks remained accessible with 5-minute cache headers
3. **No stream restart detection** - The broadcaster didn't detect when OBS stopped and restarted
4. **Overlapping R2 paths** - Old and new stream chunks used the same R2 path, causing conflicts

## Solution

### 1. Stream Restart Detection
Added automatic detection of stream restarts using two mechanisms:

#### Timeout-Based Detection
- Tracks the timestamp of the last received chunk
- If no chunks arrive for 30 seconds, considers the stream stopped
- Automatically clears state when a new chunk arrives after the timeout

#### Segment Number Detection  
- Monitors Owncast segment filenames (e.g., `0.ts`, `1.ts`, `2.ts`)
- If segment 0-2 appears after processing 10+ chunks, considers it a restart
- Immediately clears state and starts fresh

### 2. Stream Session IDs
Each stream now gets a unique session ID (Unix timestamp):
- **Before**: `live/stream-0.ts`
- **After**: `live/1761405094850/stream-0.ts`

This ensures:
- Old chunks don't conflict with new stream chunks
- Each stream has its own isolated path in R2
- Viewers can't accidentally fetch old chunks from previous streams

### 3. Improved Cache Control
Updated R2 cache headers to prevent stale content:

**Before:**
```javascript
CacheControl: 'public, max-age=300' // 5 minutes for all files
```

**After:**
```javascript
// Segments (.ts files)
CacheControl: 'public, max-age=10, s-maxage=10' // 10 seconds

// Playlists (.m3u8 files) 
CacheControl: 'no-cache, no-store, must-revalidate' // No caching
```

### 4. State Clearing Function
When a restart is detected, the broadcaster now:
1. ✅ Clears all chunks from the manifest
2. ✅ Destroys all active WebTorrent instances
3. ✅ Clears the processed chunks set
4. ✅ Resets the chunk sequence counter to 0
5. ✅ Generates a new stream session ID

## Code Changes

### broadcaster/server.js
- Added `streamSessionId` to state management
- Added `lastChunkTime` and `streamRestartTimer` tracking
- Added `clearStreamState()` function to reset all state
- Added `resetStreamRestartTimer()` for timeout-based detection
- Added segment number detection in `processChunk()`
- Updated R2 paths to include session ID: `${config.r2Path}${state.streamSessionId}/${filename}`

### broadcaster/r2-uploader.js
- Reduced cache duration from 5 minutes to 10 seconds for .ts segments
- Set no-cache for .m3u8 playlists to prevent stale manifest issues

## Testing Instructions

### Test 1: Normal Stream Restart
1. Start OBS stream
2. Wait for viewers to connect
3. Stop OBS stream
4. Wait 30+ seconds (for timeout detection)
5. Check broadcaster logs for: `🔄 Stream restart detected - clearing state...`
6. Start OBS stream again
7. Viewers should see new stream immediately (within 10 seconds)

### Test 2: Quick Stream Restart
1. Start OBS stream
2. Wait for 10+ chunks to be processed
3. Stop OBS and immediately restart
4. Check logs for segment number detection: `⚠️  Early segment number detected`
5. Verify new session ID is created
6. Viewers should transition to new stream cleanly

### Test 3: R2 Path Isolation
1. Check R2 bucket structure during a stream
2. Stop and restart the stream
3. Verify new directory is created with new timestamp
4. Old directory remains but is not referenced in new manifests

## Expected Behavior

### Before Fix
- Viewers would get stuck on old chunks
- Manifest would contain mix of old and new segments
- Cache issues would persist for 5 minutes
- Manual page refresh wouldn't help

### After Fix
- Stream restarts are automatically detected
- Manifest is cleared and rebuilt with new chunks only
- Each stream has isolated R2 path
- Viewers automatically recover within 10-30 seconds
- Manual refresh immediately shows new stream

## Monitoring

Check the broadcaster logs for these indicators:

```
🔄 Stream restart detected - clearing state...
   📋 Cleared X chunks from manifest
   🛑 Destroyed X active torrents
   🗑️  Cleared processed chunks set
   🔢 Reset chunk sequence to 0
   🆔 New stream session: 1761405094850 → 1761405096234
✅ Stream state cleared - ready for new stream
```

## Configuration

No configuration changes required. The feature is automatic. However, you can adjust:

- **Timeout duration**: Currently 30 seconds in `resetStreamRestartTimer()`
- **Segment detection threshold**: Currently 10 chunks in `processChunk()`
- **Cache durations**: In `r2-uploader.js`

## Future Improvements

1. **Active cleanup**: Optionally delete old session directories from R2 after retention period
2. **Viewer notifications**: Send WebSocket notification to viewers when stream restarts
3. **Graceful transitions**: Add fade-out/fade-in during stream switches
4. **Persistent session info**: Store session metadata for analytics

## Files Modified
- `/broadcaster/server.js` - Main detection and state management
- `/broadcaster/r2-uploader.js` - Cache header optimization
- `/broadcaster/manifest-generator.js` - No changes (already had clear() method)

