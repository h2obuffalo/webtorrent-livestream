# Native App Research - Android & Fire TV P2P Streaming

## Executive Summary

Research into building native mobile/TV apps for P2P live streaming with Chromecast support. This document analyzes different approaches after discovering limitations with Stremio (see previous project at `/Users/ran/coding/BangstreamPro/DannyPlanny/stremio-addon-template`).

**Key Finding:** Simple React Native WebView approach **won't work** due to WebRTC limitations in Android WebView.

---

## 🚨 Critical Discovery: WebView WebRTC Limitations

### The Problem

**Android System WebView** (used by React Native WebView, Ionic, Cordova, etc.) has **inconsistent/disabled WebRTC support**:

#### Why WebView ≠ Chrome Browser

| Feature | Chrome Browser | Android WebView |
|---------|----------------|-----------------|
| **WebRTC Support** | ✅ Full support | ⚠️ Limited/Disabled |
| **P2P Connections** | ✅ Works | ❌ Often blocked |
| **getUserMedia** | ✅ Available | ⚠️ Restricted |
| **Security Policy** | Standard | More restrictive |
| **Use Case** | User browsing | Embedded content |

#### What This Means

- ✅ **Your web viewer works in Chrome** (full WebRTC)
- ❌ **Same code fails in WebView** (restricted WebRTC)
- 🔍 **Cannot simply wrap web viewer** in React Native WebView

### Why This Matters

Your current web viewer (`test-p2p-branded.html`) uses:
- `p2p-media-loader-hlsjs` → requires WebRTC
- WebRTC for peer connections → blocked in WebView
- **Result:** P2P won't work in a simple app wrapper

---

## 📱 Native App Approaches

### Approach 1: React Native with WebView ❌

**Initial Idea:**
```javascript
// This WON'T work for P2P!
<WebView source={{ uri: 'https://tv.danpage.uk/test-p2p-branded.html' }} />
```

**Why It Fails:**
- Uses Android System WebView
- WebRTC disabled/restricted
- P2P connections blocked
- **Not viable for P2P streaming**

**Verdict:** ❌ Don't pursue this approach

---

### Approach 2: React Native with Native WebRTC ✅

**Better Approach:** Use native WebRTC library

#### react-native-webrtc

**Repository:** https://github.com/react-native-webrtc/react-native-webrtc

**What It Is:**
- Native WebRTC implementation for React Native
- NOT a WebView wrapper
- Full P2P capabilities
- Used in production apps (Discord, Jitsi, etc.)

**Pros:**
- ✅ Full WebRTC/P2P support on Android
- ✅ Native performance
- ✅ Can integrate with Chromecast
- ✅ Works on Fire TV (Android-based)
- ✅ Production-ready (mature library)

**Cons:**
- ❌ Cannot reuse your web viewer HTML/JS
- ❌ Must rebuild video player in React Native
- ❌ More complex implementation
- ❌ Longer development time (2-3 weeks)

**Chromecast Integration:**
- `react-native-google-cast` library
- Native casting APIs
- Proven to work

**Fire TV Compatibility:**
- ✅ React Native apps run on Fire TV
- Requires D-pad navigation support
- May need `react-native-tvos` adjustments

**Development Effort:** 🟡 Medium-High (2-3 weeks)

---

### Approach 3: TWA (Trusted Web Activity) ✅ RECOMMENDED

**What Is TWA?**

Trusted Web Activity packages your existing web app as a native Android app using **full Chrome engine** (not WebView).

#### How It Works

```
Your Web Viewer (existing)
  ↓
PWA (Progressive Web App)
  ↓
TWA Wrapper
  ↓
Native App on Play Store
  (Uses Chrome, not WebView!)
```

#### Key Advantages

**Reuses Your Working Code:**
- ✅ Your `test-p2p-branded.html` works as-is
- ✅ Full Chrome engine = full WebRTC
- ✅ P2P already proven working
- ✅ Minimal code changes

**Appears as Native App:**
- ✅ Icon on home screen
- ✅ Fullscreen (no browser UI)
- ✅ Can be on Play Store
- ✅ Looks/feels native

**Chromecast Support:**
- ✅ Chrome's built-in Cast button works
- ✅ No additional coding needed
- ✅ Standard Cast experience

**Pros:**
- ✅ **Reuses 100% of your working web viewer**
- ✅ Full WebRTC support (Chrome engine)
- ✅ Fast development (1-2 days)
- ✅ Easy maintenance (update web, app auto-updates)
- ✅ Play Store approved
- ✅ Built-in Chromecast

**Cons:**
- ❌ Requires HTTPS domain with verification
- ❌ **Does NOT work on Fire TV** (no TWA support)
- ❌ Android 5.0+ only
- ⚠️ Relies on Chrome being installed

**Requirements:**
1. HTTPS domain (you have: `tv.danpage.uk`)
2. Domain verification (prove you own it)
3. PWA manifest (add to web viewer)
4. Service Worker (optional but recommended)

**Development Effort:** 🟢 Low (1-2 days)

**Use Case:** Android phones → Chromecast

---

### Approach 4: Capacitor (Hybrid Framework) ✅

**What Is Capacitor?**

Modern hybrid framework (successor to Cordova/PhoneGap) that bridges web and native.

**Repository:** https://capacitorjs.com

#### How It Works

```
Your Web Viewer Code
  ↓
Capacitor Bridge
  ├─ Can use system Chrome engine
  ├─ Native plugin access
  └─ Packages as native app
```

#### Advantages Over TWA

**More Control:**
- ✅ Can use system Chrome engine (WebRTC works)
- ✅ Can add native plugins
- ✅ More customization options
- ✅ **Might work on Fire TV** (configurable WebView)

**Native Features:**
- Custom Chromecast plugin
- Background playback
- Notification controls
- Native UI elements

**Pros:**
- ✅ Reuses most of your web viewer code
- ✅ Can configure WebView engine (use Chrome)
- ✅ Native plugin access
- ✅ Easier than pure React Native
- ✅ **Potential Fire TV support**
- ✅ Good documentation

**Cons:**
- ⚠️ Must configure WebView to use Chrome engine
- ⚠️ More complex than TWA
- ⚠️ Fire TV support unverified (needs testing)
- ❌ More work than TWA (still less than React Native)

**Development Effort:** 🟡 Medium (1 week)

**Use Case:** Android phones + possibly Fire TV

---

### Approach 5: Native Android (Kotlin/Java) ✅

**Full Native Development:**

Build a native Android/Fire TV app from scratch using Android SDK.

**Pros:**
- ✅ Full control over everything
- ✅ Guaranteed Fire TV support
- ✅ Native WebRTC via library
- ✅ Best performance
- ✅ Can optimize for TV UX

**Cons:**
- ❌ Cannot reuse web viewer code
- ❌ Must rebuild video player
- ❌ Longest development time (3-4 weeks)
- ❌ Separate codebase to maintain

**When to Use:**
- If Fire TV is critical requirement
- If other approaches fail
- If you need maximum optimization

**Development Effort:** 🔴 High (3-4 weeks)

---

## 📺 Fire TV Considerations

### Fire TV Architecture

Fire TV is Android-based with modifications:
- Runs Android 9/10/11 (depending on device)
- Amazon App Store (not Play Store)
- Restricted sideloading on newer devices
- D-pad/remote navigation required

### Fire TV App Development

#### Option 1: React Native
- ✅ Works on Fire TV
- Requires `react-native-tvos` or TV-specific code
- Must handle D-pad navigation
- Can use `react-native-webrtc`

#### Option 2: Native Android
- ✅ Full Fire TV support
- Use Android TV SDK
- Leanback UI guidelines
- Most reliable approach

#### Option 3: Capacitor
- ⚠️ Unverified - needs testing
- May work if WebView configured correctly
- Would need Fire TV navigation handling

#### Option 4: TWA
- ❌ **Does NOT work on Fire TV**
- Fire TV doesn't support TWA
- Not an option for TV

### Fire TV App Store

**Private Apps Allowed:**
- ✅ Amazon supports "private distribution"
- ✅ Can restrict to specific users
- ✅ Login/authentication allowed
- ⚠️ Still requires Amazon approval
- ⚠️ Must follow content guidelines

**Approval Process:**
- Submit app for review
- Amazon tests functionality
- Reviews content policy compliance
- Private apps still reviewed (but not listed publicly)

**Alternative Distribution:**
- Older Fire TV devices allow sideloading
- Developer mode enables ADB install
- **Newer devices restrict this** (as you mentioned)

---

## 🏪 Google Play Store - Private Distribution

### Options for Private Apps

#### 1. Internal Testing Track

**Best for:** Small team/company testing

**Limits:**
- Up to 100 internal testers
- No Google Play review needed
- Fast deployment (minutes)
- Can update instantly

**Restrictions:**
- Must be within same Google organization
- 100 user hard limit

#### 2. Closed Testing Track

**Best for:** Event attendees, private audience

**Limits:**
- Up to 2000+ testers (expandable)
- Requires Google Play review (one-time)
- Can use email list or Google Groups
- Users get via Play Store link

**Process:**
1. Submit for review (like normal app)
2. Google reviews once
3. Add testers via email/group
4. They install from Play Store (unlisted)

**Privacy:**
- App is unlisted (not searchable)
- Only invited users can install
- Can add login screen for extra security

#### 3. Production (Unlisted)

**Best for:** Larger private audience

**Features:**
- Fully published app
- Unlisted (not searchable in Play Store)
- Only accessible via direct link
- Full Play Store review process

**Authentication:**
- ✅ Can require login/password
- ✅ Can check user credentials
- ✅ Not against Play Store policies
- ✅ Common pattern for private apps

---

## 🔐 Authentication & Access Control

### All Approaches Support Authentication

**Login Screen:**
```
App Opens
  ↓
Login Screen (native or web)
  ↓
Validate credentials
  ↓
Access stream
```

**Implementation:**
- TWA: Login page before video
- React Native: Native login screen
- Capacitor: Either native or web login

**Play Store Policy:**
- ✅ Authentication is allowed
- ✅ Private/invite-only apps are fine
- ✅ Can require password/key
- ⚠️ Must not mislead users about access

---

## 📊 Comparison Matrix

### Feature Comparison

| Feature | TWA | Capacitor | React Native | Native Android |
|---------|-----|-----------|--------------|----------------|
| **Reuses Web Code** | ✅ 100% | ✅ 90% | ❌ 0% | ❌ 0% |
| **P2P Support** | ✅ Yes | ✅ Yes* | ✅ Yes | ✅ Yes |
| **Chromecast** | ✅ Built-in | ✅ Plugin | ✅ Library | ✅ Native |
| **Fire TV Support** | ❌ No | ⚠️ Maybe | ✅ Yes | ✅ Yes |
| **Development Time** | 🟢 1-2 days | 🟡 1 week | 🟡 2-3 weeks | 🔴 3-4 weeks |
| **Maintenance** | 🟢 Low | 🟢 Low | 🟡 Medium | 🔴 High |
| **Play Store** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Amazon Store** | ❌ No | ⚠️ Maybe | ✅ Yes | ✅ Yes |

*Requires Chrome engine configuration

### Platform Support

| Platform | TWA | Capacitor | React Native | Native |
|----------|-----|-----------|--------------|--------|
| Android Phone | ✅ | ✅ | ✅ | ✅ |
| Android TV | ⚠️ | ⚠️ | ✅ | ✅ |
| Fire TV | ❌ | ⚠️ | ✅ | ✅ |
| Tablets | ✅ | ✅ | ✅ | ✅ |

### Effort vs Feature Matrix

```
High Features │                    Native Android
              │              React Native
              │        Capacitor
Low Features  │  TWA
              └──────────────────────────────
                Low Effort        High Effort
```

---

## ✅ Recommended Strategy

### Hybrid Approach (Best of All Worlds)

#### Phase 1: TWA for Android Phones → Chromecast (Week 1)

**Why:**
- ✅ Reuses working web viewer
- ✅ Fastest to market
- ✅ Covers 80% of use cases
- ✅ Proven P2P works

**Deliverable:**
- Android app on Play Store (closed testing)
- Users install, cast to Chromecast
- P2P working (already tested in browser)

**Effort:** 1-2 days

#### Phase 2: Test Stremio Addon (Week 2)

**Why:**
- Already built (`/stremio-addon`)
- Test if HLS works this time
- If works = bonus Fire TV/Apple TV support

**Deliverable:**
- Stremio addon live and tested
- Know if it works or fails

**Effort:** 1-2 days testing

#### Phase 3: Native Fire TV App (If needed, Week 3-4)

**If Stremio fails OR Fire TV is critical:**

**Option A:** React Native TV
- Cross-platform (Android TV + Fire TV)
- Reusable for tablets

**Option B:** Native Android TV
- Fire TV specific
- Most reliable

**Deliverable:**
- Fire TV app on Amazon App Store
- Native D-pad navigation
- P2P via native WebRTC

**Effort:** 2-3 weeks

---

## 🔬 Proof of Concept Testing Plan

### Step 1: Validate TWA WebRTC (Critical!)

**Must verify TWA actually supports WebRTC/P2P:**

```bash
# 1. Convert web viewer to PWA
# 2. Build TWA wrapper
# 3. Install on Android phone
# 4. Test P2P connection
# 5. Test Chromecast
```

**Success Criteria:**
- ✅ P2P connects to peers
- ✅ Stats show P2P ratio > 0%
- ✅ Chromecast button appears and works

**If fails:** Pivot to React Native or Capacitor

### Step 2: Test Capacitor WebView Engine

**If TWA works, test Capacitor for Fire TV:**

```bash
# 1. Build Capacitor app
# 2. Configure to use Chrome WebView
# 3. Test on Android phone (confirm P2P)
# 4. Test on Fire TV (if available)
```

**Success Criteria:**
- ✅ P2P works on phone
- ✅ App runs on Fire TV
- ✅ P2P works on Fire TV (bonus!)

### Step 3: React Native Fallback

**If Capacitor doesn't work on Fire TV:**

```bash
# 1. Create React Native project
# 2. Integrate react-native-webrtc
# 3. Build basic HLS player with P2P
# 4. Test on Fire TV
```

---

## 🎯 Decision Tree

```
Start Here
    ↓
Build TWA (1-2 days)
    ↓
Test P2P on Android Phone
    ↓
    ├─ Works? ──→ Ship it! (80% done)
    │              ↓
    │         Need Fire TV?
    │              ↓
    │              ├─ No ──→ ✅ Done!
    │              │
    │              └─ Yes ──→ Test Stremio
    │                          ↓
    │                          ├─ Works? ──→ ✅ Done!
    │                          │
    │                          └─ Fails ──→ Build Native Fire TV
    │
    └─ Fails? ──→ Try Capacitor
                     ↓
                     ├─ Works? ──→ Ship it!
                     │              ↓
                     │         Test on Fire TV
                     │              ↓
                     │              ├─ Works? ──→ ✅ Done!
                     │              └─ Fails ──→ Native Fire TV
                     │
                     └─ Fails? ──→ React Native (guaranteed to work)
```

---

## 📚 Resources & References

### TWA Resources
- https://developers.google.com/web/android/trusted-web-activity
- https://github.com/GoogleChrome/android-browser-helper
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap

### React Native WebRTC
- https://github.com/react-native-webrtc/react-native-webrtc
- https://www.npmjs.com/package/react-native-google-cast

### Capacitor
- https://capacitorjs.com
- https://github.com/capacitor-community/

### Fire TV Development
- https://developer.amazon.com/fire-tv
- https://developer.amazon.com/docs/fire-tv/fire-app-builder-overview.html

### Previous Research
- Stremio HLS Issues: `/Users/ran/coding/BangstreamPro/DannyPlanny/stremio-addon-template/docs/STREMIO-HLS-COMPATIBILITY.md`
- Our Stremio Addon: `/Users/ran/webtorrent-livestream/stremio-addon/`

---

## 🚀 Next Actions

### Immediate (This Week)

1. **Build TWA POC** - wrap existing web viewer
2. **Test P2P in TWA** - validate WebRTC works
3. **Test Chromecast** - confirm casting works
4. **Document results** - update this doc

### Short-term (Next 2 Weeks)

1. **Deploy TWA to Play Store** (closed testing)
2. **Test Stremio addon** on Fire TV/Apple TV
3. **Decide on Fire TV approach** based on results

### Long-term (Month 2)

1. **Build Fire TV app** (if needed)
2. **Submit to Amazon App Store**
3. **Production deployment** of all platforms

---

## 🤔 Open Questions

### Technical
- [ ] Does TWA WebRTC actually work? (CRITICAL - must test)
- [ ] Can Capacitor use Chrome engine on Fire TV?
- [ ] Does Stremio HLS work better now than DannyPlanny project?
- [ ] What's the real Play Store review time for private apps?

### Business
- [ ] How many users need Fire TV vs Android phone?
- [ ] Is Amazon App Store approval process manageable?
- [ ] What's the authentication/login flow?
- [ ] Do we need DVR/rewind functionality?

---

## 📅 Last Updated

**Date:** October 24, 2025  
**Status:** Research Complete - Ready for POC Phase  
**Next Step:** Build TWA wrapper and test WebRTC/P2P  

---

## 💡 Key Takeaways

1. ❌ **Simple WebView wrapper won't work** - WebRTC limitations
2. ✅ **TWA is best for Android phones** - reuses working code
3. ⚠️ **Fire TV needs different approach** - TWA not supported
4. 🧪 **Must validate with POC** - don't assume WebRTC works
5. 📱 **Play Store supports private apps** - authentication is fine
6. 🎯 **Hybrid strategy recommended** - TWA + native Fire TV
7. 🔄 **Stremio worth testing** - already built, might work now

---

**Related Documents:**
- [`ARCHITECTURE-STREMIO.md`](../ARCHITECTURE-STREMIO.md) - Overall architecture
- [`PRIOR-ART.md`](PRIOR-ART.md) - live-torrent research
- Previous Stremio issues: `/Users/ran/coding/BangstreamPro/DannyPlanny/stremio-addon-template/docs/`

