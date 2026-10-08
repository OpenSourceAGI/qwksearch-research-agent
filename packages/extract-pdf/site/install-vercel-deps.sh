#!/usr/bin/env bash
# Install script for Vercel deployment
# Swaps package.json with deployment version before npm install
# This is needed because the original package.json uses workspace:* which npm rejects

set -e

SITE_DIR="$(dirname "$0")"
PKG_JSON="$SITE_DIR/package.json"
PKG_JSON_BACKUP="$SITE_DIR/package.json.backup"
PKG_JSON_VERCEL="$SITE_DIR/package.json.vercel"

# Backup original package.json
cp "$PKG_JSON" "$PKG_JSON_BACKUP"

# Use deployment package.json
cp "$PKG_JSON_VERCEL" "$PKG_JSON"

echo "Using deployment package.json for install"

# Run npm install with published deps (not workspace:*)
npm install --dangerously-allow-all-scripts

# Restore original package.json immediately (build script will handle the swap if needed)
mv "$PKG_JSON_BACKUP" "$PKG_JSON"

echo "npm install complete! Original package.json restored."
