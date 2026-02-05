#!/bin/bash
# Build signed and notarized DMG for Project Jumpstart
# Usage: ./scripts/build-dmg.sh
#
# Prerequisites:
# - Apple Developer ID certificate installed in keychain
# - Environment variables set (or will use defaults from CLAUDE.md):
#   - APPLE_ID
#   - APPLE_PASSWORD (app-specific password)
#   - APPLE_TEAM_ID

set -e

# Default credentials (from CLAUDE.md)
APPLE_ID="${APPLE_ID:-john@greatfallsventures.com}"
APPLE_PASSWORD="${APPLE_PASSWORD:-hiam-ebkk-xrha-djbz}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-KACZ4GS4RL}"
SIGNING_IDENTITY="Developer ID Application: John McKinley (KACZ4GS4RL)"

echo "=== Building Project Jumpstart ==="

# Build the Tauri app (signed and notarized)
echo "Building Tauri app..."
APPLE_ID="$APPLE_ID" APPLE_PASSWORD="$APPLE_PASSWORD" APPLE_TEAM_ID="$APPLE_TEAM_ID" pnpm tauri build

# Navigate to bundle directory
cd src-tauri/target/release/bundle/macos

# Remove old DMG if exists
rm -f "Project Jumpstart_aarch64.dmg"

# Create DMG
echo "Creating DMG..."
hdiutil create -volname "Project Jumpstart" -srcfolder "Project Jumpstart.app" -ov -format UDZO "Project Jumpstart_aarch64.dmg"

# Sign DMG
echo "Signing DMG..."
codesign --force --sign "$SIGNING_IDENTITY" "Project Jumpstart_aarch64.dmg"

# Notarize DMG
echo "Notarizing DMG (this may take a few minutes)..."
xcrun notarytool submit "Project Jumpstart_aarch64.dmg" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# Staple the ticket
echo "Stapling notarization ticket..."
xcrun stapler staple "Project Jumpstart_aarch64.dmg"

# Verify
echo "Verifying..."
spctl --assess --type open --context context:primary-signature -v "Project Jumpstart_aarch64.dmg"

echo ""
echo "=== Build Complete ==="
echo "DMG location: $(pwd)/Project Jumpstart_aarch64.dmg"
