#!/usr/bin/env bash
# Build script for Vercel deployment (demo only)
# Temporarily moves docs directories out of the way during build
# Swaps DemoMount for Vercel-only version

set -e

SITE_DIR="$(dirname "$0")"
APP_DOCS_DIR="$SITE_DIR/app/docs"
APP_DOCS_BACKUP="$SITE_DIR/app/docs.vercel-backup"
CONTENT_DOCS_DIR="$SITE_DIR/content/docs"
CONTENT_DOCS_BACKUP="$SITE_DIR/content/docs.vercel-backup"
DEMO_MOUNT="$SITE_DIR/components/demo/DemoMount.tsx"
DEMO_MOUNT_BACKUP="$SITE_DIR/components/demo/DemoMount.tsx.backup"
DEMO_MOUNT_VERCEL="$SITE_DIR/components/demo/DemoMount.vercel.tsx"

# Move docs directories out of the way
if [ -d "$APP_DOCS_DIR" ]; then
  echo "Moving app/docs directory to backup..."
  mv "$APP_DOCS_DIR" "$APP_DOCS_BACKUP"
fi

if [ -d "$CONTENT_DOCS_DIR" ]; then
  echo "Moving content/docs directory to backup..."
  mv "$CONTENT_DOCS_DIR" "$CONTENT_DOCS_BACKUP"
fi

# Swap DemoMount for Vercel version
if [ -f "$DEMO_MOUNT" ]; then
  echo "Swapping DemoMount for Vercel version..."
  cp "$DEMO_MOUNT" "$DEMO_MOUNT_BACKUP"
  cp "$DEMO_MOUNT_VERCEL" "$DEMO_MOUNT"
fi

# Run Next.js build
echo "Running Next.js build..."
npx next build

# Restore docs directories
if [ -d "$APP_DOCS_BACKUP" ]; then
  echo "Restoring app/docs directory..."
  mv "$APP_DOCS_BACKUP" "$APP_DOCS_DIR"
fi

if [ -d "$CONTENT_DOCS_BACKUP" ]; then
  echo "Restoring content/docs directory..."
  mv "$CONTENT_DOCS_BACKUP" "$CONTENT_DOCS_DIR"
fi

# Restore DemoMount
if [ -f "$DEMO_MOUNT_BACKUP" ]; then
  echo "Restoring DemoMount..."
  mv "$DEMO_MOUNT_BACKUP" "$DEMO_MOUNT"
fi

echo "Build complete!"