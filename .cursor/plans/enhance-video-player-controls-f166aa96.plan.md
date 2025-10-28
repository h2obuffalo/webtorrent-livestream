<!-- f166aa96-5f59-4ce2-a49f-b30b0d733230 77caeb17-2a77-40e3-ab73-835ee3386396 -->
# Implement Chromecast Functionality

Based on the guide at https://dev.to/cristovoxdgm/how-to-implement-video-casting-in-flutter-2j28

## 1. Add Dependencies

Update `flutter_viewer/pubspec.yaml`:

```yaml
dependencies:
  cast: ^2.1.0
```

## 2. Configure Android Manifest

According to the cast package documentation, we need to update `flutter_viewer/android/app/src/main/AndroidManifest.xml`:

- Add required permissions for network discovery
- Add metadata for Google Cast options
- Configure receiver app ID (we'll use the default media receiver: CC1AD845)

## 3. Create Cast Service

Create `flutter_viewer/lib/services/cast_service.dart` following Clean Architecture:

**Key methods to implement:**

- `searchDevices()` - Discover available Chromecast devices
- `connect({required CastDevice device})` - Connect to a device
- `openMedia({required String url, title, thumb})` - Load and play video
- `playMedia()` / `pauseMedia()` - Control playback
- `forward10seconds()` / `backwards10seconds()` - Seek controls
- `setVolume({required bool isMuted})` - Volume control
- `stopSession()` - Disconnect from device
- `listenToStateStream()` - Monitor connection state
- `listenToMessageStream()` - Monitor media messages

**Important details:**

- Use `CastDiscoveryService().search()` to find devices
- Use `CastSessionManager().startSession()` to connect
- Default media receiver app ID: `CC1AD845`
- Send messages via `currentSession?.sendMessage()`
- Use namespace `CastSession.kNamespaceMedia` for media controls
- Use namespace `CastSession.kNamespaceReceiver` for receiver controls

## 4. Add Cast UI Elements

Update `flutter_viewer/lib/screens/simple_player_screen.dart`:

**Add Cast Button:**

- Add a cast icon button to the app bar
- Show different icon states: available, connecting, connected
- Open device selection dialog on tap

**Device Selection Dialog:**

- Show list of discovered Chromecast devices
- Display device name and connection status
- Allow user to select and connect to device

**Connected State UI:**

- Show "casting" indicator when connected
- Modify controls to send commands to cast device instead of local player
- Add disconnect button

## 5. Integrate with Video Player

**Modify playback logic:**

- When casting: send media URL to Chromecast and hide local player
- When not casting: use local video_player as normal
- Sync play/pause state between cast and local
- Forward seek controls to cast session when connected

**Handle HLS stream:**

- Pass `AppConstants.hlsManifestUrl` to cast service
- Set content type as `'application/x-mpegurl'` or `'video/mp2t'` for HLS
- Include video title and thumbnail in metadata

## 6. State Management

**Add to `_SimplePlayerScreenState`:**

```dart
CastSession? _castSession;
CastDevice? _connectedDevice;
bool _isCasting = false;
List<CastDevice> _availableDevices = [];
```

**Listen to cast state:**

- Monitor `_castSession?.stateStream` for connection changes
- Update UI based on casting state
- Handle disconnections gracefully

## 7. Testing Considerations

**Important notes:**

- Cast functionality requires physical device or emulator with Google Play Services
- Need Chromecast device or Google Cast-enabled TV on same network
- Test with actual HLS stream URL: `https://tv.danpage.uk/live/playlist.m3u8`
- Verify media controls work (play, pause, seek, volume)

## Implementation Order

1. Add cast dependency and configure AndroidManifest
2. Create CastService with basic connection logic
3. Add cast button to player screen
4. Implement device discovery and connection
5. Integrate media loading and playback
6. Add playback controls for cast session
7. Test with Chromecast device

## Files to Modify/Create

- `flutter_viewer/pubspec.yaml` - Add cast dependency
- `flutter_viewer/android/app/src/main/AndroidManifest.xml` - Add permissions
- `flutter_viewer/lib/services/cast_service.dart` - New file (cast logic)
- `flutter_viewer/lib/screens/simple_player_screen.dart` - Add cast UI and integration
- `flutter_viewer/lib/widgets/cast_device_dialog.dart` - New file (optional, for device selection)

## Notes

- Prioritize Android/Chromecast (iOS AirPlay can be added later)
- Maintain cyberpunk UI theme for cast elements
- Keep existing local playback working when not casting
- Ensure proper cleanup of cast sessions on dispose