# Multiple Quality Streams - Issues & Future Implementation Guide

**Date**: October 27, 2025  
**Status**: Temporarily removed due to stability issues  
**Reason**: Causing problems with broadcaster stability

---

## 🚨 Issues Encountered

### 1. Broadcaster Processing Problems

**Symptoms:**
- Broadcaster getting stuck in processing loops
- Single chunks being repeated across different players
- Manifest generation corruption
- Chunk processing race conditions

**Root Causes:**
- Multiple quality streams created multiple torrent seeding processes
- Increased complexity in chunk tracking and manifest generation
- Resource contention between different quality variants
- Memory pressure from multiple simultaneous torrent operations

### 2. Manifest Generator Conflicts

**Symptoms:**
- HLS playlist corruption with multiple quality levels
- Wrong chunk URLs or ordering in manifests
- Inconsistent chunk availability across quality variants
- Players receiving mismatched quality segments

**Technical Issues:**
- Manifest generator not designed for multiple quality variants
- Chunk tracking became complex with multiple bitrates
- R2 upload coordination issues between quality variants
- Stream restart detection problems with multiple qualities

### 3. Resource Management Issues

**Symptoms:**
- High CPU usage from multiple torrent seeding processes
- Memory leaks in WebTorrent instances
- Increased bandwidth usage for seeding multiple qualities
- Docker container resource limits exceeded

**Performance Impact:**
- Each quality variant required separate torrent seeding
- Multiple R2 upload processes running simultaneously
- Increased signaling server load for quality coordination
- Higher storage costs for multiple quality chunks

### 4. Stream Restart Detection Problems

**Symptoms:**
- Stream restart detection failing with multiple qualities
- Old quality variants persisting after stream restart
- Inconsistent stream session IDs across quality levels
- Chunk cleanup issues with multiple quality streams

**Implementation Issues:**
- Stream restart detection logic not accounting for multiple qualities
- Session ID management became complex
- State clearing functions not handling multiple quality variants
- R2 path conflicts between old and new quality streams

---

## 🔧 Potential Fixes & Solutions

### 1. Architecture Redesign

**Single Quality First Approach:**
```javascript
// Current: Multiple qualities processed simultaneously
// Proposed: Process single quality, add others later

// Phase 1: Stable single quality
const singleQuality = {
  bitrate: 2500,
  resolution: '1280x720',
  enabled: true
};

// Phase 2: Add adaptive quality switching
const adaptiveQualities = [
  { bitrate: 1500, resolution: '854x480', label: 'Low' },
  { bitrate: 2500, resolution: '1280x720', label: 'Medium' },
  { bitrate: 4000, resolution: '1920x1080', label: 'High' }
];
```

**Resource Management:**
- Implement quality-based resource limits
- Add quality-specific memory management
- Create quality-specific torrent pools
- Implement quality-based cleanup policies

### 2. Manifest Generator Improvements

**Multi-Quality Manifest Support:**
```javascript
class MultiQualityManifestGenerator {
  constructor(config) {
    this.qualities = config.qualities || ['720p'];
    this.manifests = new Map(); // quality -> manifest
    this.chunkTracking = new Map(); // quality -> chunks
  }

  addChunk(chunkInfo, quality) {
    // Track chunks per quality
    if (!this.chunkTracking.has(quality)) {
      this.chunkTracking.set(quality, []);
    }
    this.chunkTracking.get(quality).push(chunkInfo);
  }

  generateMasterPlaylist() {
    // Generate master playlist with quality variants
    return this.generateHLSMasterPlaylist();
  }

  generateQualityManifest(quality) {
    // Generate individual quality manifest
    return this.generateHLSPlaylist(quality);
  }
}
```

**Key Improvements:**
- Separate manifest generation per quality
- Master playlist for adaptive streaming
- Quality-specific chunk tracking
- Improved error handling per quality

### 3. Stream Restart Detection Enhancement

**Quality-Aware Restart Detection:**
```javascript
function clearStreamState() {
  // Clear state for all qualities
  Object.keys(state.qualities).forEach(quality => {
    clearQualityState(quality);
  });
  
  // Reset quality-specific counters
  state.qualityCounters = {};
  state.qualitySessions = {};
}

function detectStreamRestart(filename, quality) {
  // Check restart per quality
  const qualityState = state.qualities[quality];
  if (qualityState && isRestartSegment(filename)) {
    clearQualityState(quality);
    return true;
  }
  return false;
}
```

**Improvements:**
- Quality-specific restart detection
- Per-quality state management
- Quality-aware session IDs
- Improved cleanup per quality

### 4. Resource Optimization

**Quality-Based Resource Limits:**
```javascript
const qualityConfig = {
  '480p': {
    maxTorrents: 5,
    maxMemoryMB: 100,
    priority: 'low'
  },
  '720p': {
    maxTorrents: 10,
    maxMemoryMB: 200,
    priority: 'medium'
  },
  '1080p': {
    maxTorrents: 15,
    maxMemoryMB: 300,
    priority: 'high'
  }
};
```

**Resource Management:**
- Quality-specific torrent limits
- Memory usage monitoring per quality
- Priority-based resource allocation
- Automatic quality degradation under load

---

## 📋 Future Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. **Stabilize Single Quality**
   - Ensure current single quality implementation is rock solid
   - Fix any remaining stability issues
   - Implement comprehensive monitoring

2. **Resource Management**
   - Add resource monitoring and limits
   - Implement quality-based resource allocation
   - Add automatic quality degradation

### Phase 2: Multi-Quality Architecture (Week 3-4)
1. **Manifest Generator Redesign**
   - Implement multi-quality manifest generator
   - Add master playlist support
   - Implement quality-specific chunk tracking

2. **Stream Restart Detection**
   - Enhance restart detection for multiple qualities
   - Implement quality-aware state management
   - Add quality-specific cleanup

### Phase 3: Adaptive Streaming (Week 5-6)
1. **Client-Side Quality Selection**
   - Implement bandwidth detection
   - Add quality switching logic
   - Implement fallback mechanisms

2. **Server-Side Optimization**
   - Add quality-based resource limits
   - Implement intelligent quality selection
   - Add quality-specific monitoring

### Phase 4: Testing & Optimization (Week 7-8)
1. **Comprehensive Testing**
   - Test all quality combinations
   - Test stream restart scenarios
   - Test resource limits and degradation

2. **Performance Optimization**
   - Optimize resource usage
   - Implement caching strategies
   - Add quality-specific monitoring

---

## 🎯 Key Lessons Learned

### 1. Complexity Management
- **Lesson**: Multiple quality streams significantly increase system complexity
- **Solution**: Implement incrementally, starting with single quality stability

### 2. Resource Planning
- **Lesson**: Multiple qualities require careful resource management
- **Solution**: Implement quality-based resource limits and monitoring

### 3. State Management
- **Lesson**: Stream restart detection becomes complex with multiple qualities
- **Solution**: Implement quality-aware state management and cleanup

### 4. Testing Strategy
- **Lesson**: Multiple quality combinations require extensive testing
- **Solution**: Implement comprehensive test scenarios for all quality combinations

---

## 🔍 Monitoring & Debugging

### Quality-Specific Metrics
```javascript
const qualityMetrics = {
  '480p': {
    torrents: 0,
    peers: 0,
    chunks: 0,
    memoryUsage: 0,
    uploadSpeed: 0
  },
  '720p': {
    torrents: 0,
    peers: 0,
    chunks: 0,
    memoryUsage: 0,
    uploadSpeed: 0
  },
  '1080p': {
    torrents: 0,
    peers: 0,
    chunks: 0,
    memoryUsage: 0,
    uploadSpeed: 0
  }
};
```

### Debugging Tools
- Quality-specific log levels
- Per-quality health endpoints
- Quality-specific monitoring dashboards
- Resource usage tracking per quality

---

## 📚 References

### Related Documentation
- `STREAM-RESTART-FIX.md` - Stream restart detection implementation
- `FIXES-APPLIED.md` - Critical fixes applied to single quality
- `CURRENT-ISSUES-SUMMARY.md` - Current stability issues
- `docs/R2-OPTIMIZATION.md` - R2 optimization strategies

### Code References
- `broadcaster/server.js` - Main broadcaster implementation
- `broadcaster/manifest-generator.js` - Manifest generation logic
- `flutter_viewer/lib/config/constants.dart` - Quality configuration

---

## 🚀 Next Steps

1. **Immediate**: Focus on stabilizing single quality implementation
2. **Short-term**: Implement comprehensive monitoring and resource management
3. **Medium-term**: Redesign architecture for multi-quality support
4. **Long-term**: Implement adaptive streaming with quality switching

**Remember**: Stability first, features second. A stable single quality stream is better than an unstable multi-quality stream.
