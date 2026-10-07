#!/usr/bin/env bash
# Deploy script for Vercel
# Uses a pre-created package.json.vercel with explicit dependencies

set -e

SITE_DIR="$(dirname "$0")"
PKG_JSON="$SITE_DIR/package.json"
PKG_JSON_BACKUP="$SITE_DIR/package.json.backup"
PKG_JSON_VERCEL="$SITE_DIR/package.json.vercel"

# Backup original package.json
cp "$PKG_JSON" "$PKG_JSON_BACKUP"

# Use deployment package.json
cp "$PKG_JSON_VERCEL" "$PKG_JSON"

echo "Using deployment package.json"

# Run the build
./build-vercel.sh

# Restore original package.json
mv "$PKG_JSON_BACKUP" "$PKG_JSON"

echo "Restored original package.json"
echo "Deploy complete!"