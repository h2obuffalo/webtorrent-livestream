# Flutter Mobile App Testing Guide

## Overview
This guide covers manual testing procedures for the Flutter mobile app to ensure stream stability and robust error handling.

## Prerequisites
- Android device with wireless debugging enabled
- Active OBS stream at `https://tv.danpage.uk/live/playlist.m3u8`
- Stable internet connection for testing

## Test Scenarios

### 1. Stream Reconnection Tests

#### Test 1.1: Automatic Reconnection
**Objective**: Verify app automatically reconnects when stream is interrupted

**Steps**:
1. Launch app and start playing stream
2. Stop OBS stream for 10 seconds
3. Restart OBS stream
4. Observe app behavior

**Expected Result**: App should show "Reconnecting..." overlay and automatically resume playback when stream returns

**Pass Criteria**: 
- Shows reconnection indicator
- Attempts up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Successfully resumes playback without user intervention

#### Test 1.2: Manual Retry
**Objective**: Verify manual retry button works

**Steps**:
1. Launch app
2. While stream is playing, turn off OBS
3. Wait until app shows error screen
4. Click "Retry" button
5. Restart OBS

**Expected Result**: App immediately attempts to reconnect

#### Test 1.3: Reload Button
**Objective**: Verify reload button restarts player

**Steps**:
1. Play stream
2. Encounter error
3. Click "Reload" button

**Expected Result**: Player fully restarts and reinitializes

### 2. Network Change Tests

#### Test 2.1: WiFi to Cellular Switch
**Objective**: Verify seamless network switching

**Steps**:
1. Connect to WiFi and start stream
2. Disable WiFi (switch to cellular)
3. Observe playback

**Expected Result**: Playback continues with minimal glitch

**Pass Criteria**: Video plays within 2 seconds of switch

#### Test 2.2: Cellular to WiFi Switch
**Objective**: Test reverse network switch

**Steps**:
1. Start on cellular connection
2. Enable WiFi
3. Observe behavior

**Expected Result**: Seamless transition

#### Test 2.3: Complete Connection Loss
**Objective**: Test behavior when all networks lost

**Steps**:
1. Enable airplane mode
2. Observe app response

**Expected Result**: 
- Shows "No Connection" indicator
- Error message displayed after timeout

### 3. Lifecycle Tests

#### Test 3.1: Background Playback
**Objective**: Verify pausing when app goes to background

**Steps**:
1. Start playing stream
2. Press home button
3. Wait 5 seconds
4. Return to app

**Expected Result**: 
- Playback paused when backgrounded
- Resumes when returning to foreground

**Pass Criteria**: Stream stops immediately on background, resumes on return

#### Test 3.2: Lock Screen
**Objective**: Test screen lock behavior

**Steps**:
1. Start stream
2. Lock device
3. Unlock device

**Expected Result**: Stream paused during lock, resumes on unlock

#### Test 3.3: App Switcher
**Objective**: Test app switching behavior

**Steps**:
1. Start stream
2. Open another app (swipe up for recent apps)
3. Return to live stream app

**Expected Result**: Stream resumes from where it paused

### 4. Connection Indicator Tests

#### Test 4.1: WiFi Indicator
**Objective**: Verify WiFi icon displays correctly

**Steps**:
1. Connect to WiFi
2. Launch app

**Expected Result**: Green WiFi icon in app bar

#### Test 4.2: Cellular Indicator
**Objective**: Verify cellular icon displays

**Steps**:
1. Disable WiFi
2. Use cellular data
3. Launch app

**Expected Result**: Orange cellular icon in app bar

#### Test 4.3: No Connection Indicator
**Objective**: Verify offline indicator

**Steps**:
1. Enable airplane mode
2. Launch app

**Expected Result**: Red "no signal" icon in app bar

### 5. Error Recovery Tests

#### Test 5.1: Recoverable Error
**Objective**: Test automatic recovery from network timeout

**Steps**:
1. Start stream
2. Temporarily throttle connection to <1Mbps
3. Wait for buffering/error
4. Restore full connection

**Expected Result**: App automatically recovers and continues playing

#### Test 5.2: Fatal Error Handling
**Objective**: Test behavior with invalid stream URL

**Steps**:
1. Modify stream URL to invalid value
2. Launch app
3. Observe error message

**Expected Result**: 
- Shows "Stream not available" message
- Does not attempt infinite reconnection

#### Test 5.3: Retry After Multiple Failures
**Objective**: Test giving up after 5 attempts

**Steps**:
1. Ensure OBS is not running
2. Launch app
3. Wait for reconnection attempts

**Expected Result**: 
- Shows "Attempt X/5" for each retry
- After 5 failed attempts, shows error with manual retry options

### 6. Live Indicator Tests

#### Test 6.1: Live Badge Display
**Objective**: Verify LIVE indicator appears

**Steps**:
1. Start playing stream
2. Check top-right corner

**Expected Result**: Red "LIVE" badge with pulsing dot

#### Test 6.2: Live Badge Persistence
**Objective**: Ensure badge doesn't disappear

**Steps**:
1. Play stream for 5+ minutes
2. Observe LIVE badge

**Expected Result**: Badge remains visible throughout playback

### 7. Performance Tests

#### Test 7.1: Long Playback Session
**Objective**: Test for memory leaks

**Steps**:
1. Play stream for 30+ minutes
2. Monitor device memory usage
3. Check for crashes or slowdowns

**Expected Result**: 
- No memory leaks
- Smooth playback throughout
- No crashes

**Pass Criteria**: App memory usage stable (±20MB variation)

#### Test 7.2: Rapid Play/Pause
**Objective**: Test rapid state changes

**Steps**:
1. Toggle play/pause 10 times rapidly
2. Observe behavior

**Expected Result**: No crashes, smooth state transitions

#### Test 7.3: Cold Start Performance
**Objective**: Measure startup time

**Steps**:
1. Force close app
2. Launch app with timer
3. Measure time to first frame

**Expected Result**: First frame visible within 3-5 seconds

### 8. Edge Cases

#### Test 8.1: Stream Starts After App Launch
**Objective**: Test when app opens before stream starts

**Steps**:
1. Ensure OBS is stopped
2. Launch app
3. Start OBS
4. Observe app behavior

**Expected Result**: App should detect stream when it becomes available

#### Test 8.2: Multiple App Instances
**Objective**: Test if multiple instances cause issues

**Steps**:
1. Launch app
2. Use recent apps to see if multiple instances exist
3. Open second instance if possible

**Expected Result**: Only one instance should be active

#### Test 8.3: Rapid Reconnection Scenarios
**Objective**: Test extreme reconnection behavior

**Steps**:
1. Rapidly toggle airplane mode on/off every 3 seconds
2. Observe app stability

**Expected Result**: App remains stable, doesn't crash

## Bug Reporting

When filing bug reports, include:
1. Test scenario number
2. Device model and Android version
3. Steps to reproduce
4. Expected vs actual behavior
5. Logcat output (if available)
6. Screenshot/video if applicable

## Performance Benchmarks

### Target Metrics
- **Latency**: <20 seconds behind live
- **Startup Time**: <5 seconds to first frame
- **Memory Usage**: <150MB sustained
- **CPU Usage**: <15% average during playback
- **Reconnection Time**: <2 seconds for network switch

## Known Issues
- None currently

## Future Test Scenarios
- [ ] P2P chunk sharing (when implemented)
- [ ] Stats overlay functionality
- [ ] Picture-in-Picture mode
- [ ] Adaptive bitrate selection
- [ ] Offline viewing capabilities
