# Feature: Custom Idents & Adverts System

## Overview
Replace Owncast's default "Stream is Offline" video with custom idents, adverts, and branded content stored in memory for instant playback during stream interruptions.

## Use Cases
1. **Stream Restarts** - Play branded ident while OBS restarts
2. **Scheduled Breaks** - Show adverts during planned intermissions
3. **Technical Issues** - Display "Please Stand By" with branding
4. **Between Sets** - Show sponsor content or upcoming events

## Requirements

### Content Management
- [ ] Store video files in memory (pre-loaded)
- [ ] Support multiple content types:
  - [ ] Station idents (BangFace branding)
  - [ ] Sponsor adverts
  - [ ] "Please Stand By" messages
  - [ ] Event promos
- [ ] Configure content duration and loop behavior
- [ ] Playlist/rotation system for multiple files

### Triggering System
- [ ] Automatic: Detect stream stop (current 15s timeout)
- [ ] Manual: API endpoint to trigger specific content
- [ ] Scheduled: Time-based rotation (e.g., show advert every hour)
- [ ] Event-based: Webhook triggers from Owncast

### Technical Implementation
- [ ] Pre-encode videos to match stream settings
  - Same resolution (1080p or 720p)
  - Same codec (H.264)
  - Same bitrate
  - Same segment duration (5-6 seconds)
- [ ] Store as HLS segments in memory
- [ ] Seamless insertion into live manifest
- [ ] Use `#EXT-X-DISCONTINUITY` for smooth transitions

### Configuration
```javascript
{
  "idents": {
    "enabled": true,
    "defaultOnOffline": "bangface-ident-v1",
    "loopUntilStreamReturns": true,
    "content": [
      {
        "id": "bangface-ident-v1",
        "name": "BangFace Station Ident",
        "file": "/content/idents/bangface-ident.mp4",
        "duration": 10,
        "loop": true
      },
      {
        "id": "please-stand-by",
        "name": "Technical Difficulties",
        "file": "/content/idents/stand-by.mp4",
        "duration": 15,
        "loop": true
      }
    ]
  },
  "adverts": {
    "enabled": true,
    "rotationType": "sequential", // or "random"
    "playlistType": "once", // or "loop"
    "content": [
      {
        "id": "sponsor-1",
        "name": "Event Sponsor Ad",
        "file": "/content/adverts/sponsor-1.mp4",
        "duration": 30
      },
      {
        "id": "upcoming-event",
        "name": "Next Event Promo",
        "file": "/content/adverts/next-event.mp4",
        "duration": 20
      }
    ]
  }
}
```

### API Endpoints
```javascript
// Manual control
POST /api/content/play
{
  "contentId": "bangface-ident-v1",
  "loop": true
}

POST /api/content/stop
// Return to live stream

GET /api/content/list
// List available content

POST /api/content/upload
// Upload new content file

// Status
GET /api/content/status
{
  "playing": true,
  "contentId": "bangface-ident-v1",
  "elapsedSeconds": 45,
  "looping": true
}
```

### Viewer Experience
1. **Stream stops** → 15s timeout → Ident starts automatically
2. **HLS player sees** `#EXT-X-DISCONTINUITY` → Smooth transition
3. **Ident loops** until stream returns
4. **Stream starts** → `#EXT-X-DISCONTINUITY` → Back to live
5. **No manual refresh needed**

## Implementation Phases

### Phase 1: Basic Offline Ident (MVP)
- [ ] Single pre-loaded video file
- [ ] Auto-play on stream stop
- [ ] Loop until stream returns
- [ ] HLS segment generation from video
- [ ] Discontinuity tag insertion

### Phase 2: Multiple Content & Rotation
- [ ] Multiple ident files
- [ ] Configuration file support
- [ ] Sequential/random rotation
- [ ] Content duration tracking

### Phase 3: Adverts & Scheduling
- [ ] Separate adverts playlist
- [ ] Time-based triggering
- [ ] Scheduled breaks (e.g., every 60 minutes)
- [ ] Manual trigger API

### Phase 4: Advanced Features
- [ ] Web UI for content management
- [ ] Real-time content upload
- [ ] Analytics (views, completion rate)
- [ ] A/B testing for adverts
- [ ] Sponsor reporting

## Technical Architecture

```
┌─────────────────────────────────────────────┐
│         Ident/Advert Content Manager        │
│  (Pre-loads videos as HLS segments in RAM)  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│        Stream State Monitor                  │
│  - Detects stream stop (15s timeout)        │
│  - Triggers content playback                 │
│  - Monitors for stream return                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Manifest Generator                   │
│  - Inserts ident/advert segments            │
│  - Adds discontinuity tags                   │
│  - Switches back to live seamlessly          │
└─────────────────────────────────────────────┘
```

## Content Preparation Guide

### Video Requirements
- **Container**: MP4
- **Video Codec**: H.264 (Main or High profile)
- **Audio Codec**: AAC
- **Resolution**: Match stream (1920x1080 or 1280x720)
- **Frame Rate**: 30fps (match stream)
- **Bitrate**: 2500kbps video, 128kbps audio

### Pre-processing Command (FFmpeg)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -profile:v high -preset fast \
  -b:v 2500k -maxrate 2500k -bufsize 5000k \
  -c:a aac -b:a 128k -ar 44100 \
  -r 30 -g 60 -keyint_min 60 \
  -sc_threshold 0 \
  -f hls -hls_time 6 -hls_list_size 0 \
  -hls_segment_filename 'ident_%03d.ts' \
  ident.m3u8
```

## Storage Options

### Option A: In-Memory (Fastest)
- Pre-load all segments into RAM on startup
- 10-30 second videos = 5-10MB each
- Instant playback, no disk I/O

### Option B: Local Disk (Cheaper)
- Store in `/content/idents/` directory
- Load segments on-demand
- Slightly higher latency

### Option C: R2 Storage (Scalable)
- Upload pre-processed segments to R2
- Use for very large content libraries
- Good for multi-server deployments

## Benefits

✅ **Branded Experience** - Custom content instead of generic offline screen  
✅ **Professional** - Smooth transitions with no refresh needed  
✅ **Monetization** - Show sponsor ads during breaks  
✅ **Engagement** - Keep viewers informed and entertained  
✅ **Flexibility** - Easy content updates and rotation  

## Dependencies

- FFmpeg (for video preprocessing)
- Node.js (in-memory storage and serving)
- HLS.js (already in use)

## Estimated Effort

- **Phase 1 (MVP)**: 8-12 hours
- **Phase 2 (Rotation)**: 4-6 hours
- **Phase 3 (Scheduling)**: 6-8 hours
- **Phase 4 (UI & Analytics)**: 12-16 hours

**Total**: 30-42 hours for full implementation

## Priority

🔥 **High** - Would significantly improve viewer experience during stream restarts and provide monetization opportunities.

---

**Status**: Planning / Not Started  
**Created**: October 25, 2025  
**Next Step**: Discuss content requirements and prepare first ident video

