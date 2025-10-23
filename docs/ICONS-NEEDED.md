# PWA Icons Required

The viewer PWA needs icon files for installation on mobile devices.

## Required Files

Place these files in `/viewer/public/`:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## Design Guidelines

- **Background**: Use the theme color `#1a1a2e` (dark blue) or make transparent
- **Icon design**: Consider a video play button or streaming icon
- **Format**: PNG with transparency
- **Purpose**: `any maskable` (works on all platforms)

## Quick Generation Options

### Option 1: Online Generator

Use a PWA icon generator:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Upload a 512x512 source image and it will generate all sizes.

### Option 2: Create with ImageMagick

If you have a source SVG or large PNG:

```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt install imagemagick  # Linux

# Generate from source
convert source-icon.png -resize 192x192 viewer/public/icon-192.png
convert source-icon.png -resize 512x512 viewer/public/icon-512.png
```

### Option 3: Simple Placeholder

For testing purposes, create simple colored squares:

```bash
cd viewer/public

# Create 192x192 placeholder (dark blue with white play icon)
convert -size 192x192 xc:"#1a1a2e" \
  -fill white -pointsize 80 -gravity center \
  -annotate +0+0 "▶" \
  icon-192.png

# Create 512x512 placeholder
convert -size 512x512 xc:"#1a1a2e" \
  -fill white -pointsize 200 -gravity center \
  -annotate +0+0 "▶" \
  icon-512.png
```

## Recommended Design

A simple design that works well:
- **Background**: Gradient from `#1a1a2e` to `#16213e`
- **Icon**: White play button (▶) or streaming waves icon
- **Text**: Optional "LIVE" badge in corner with red dot

## Verification

After creating icons:

1. Check files exist:
   ```bash
   ls -lh viewer/public/icon-*.png
   ```

2. Test in browser DevTools:
   - Open viewer in Chrome
   - DevTools → Application → Manifest
   - Should show both icons without errors

3. Test PWA installation:
   - Chrome mobile: "Add to Home Screen"
   - Should use your custom icons

## Current Status

⚠️ **Icons are NOT included** in the repository (files too large/binary)

You must generate these icons before deploying to production or testing PWA installation.

For development, the app will work fine without icons, but installation prompts may show generic browser icons.

