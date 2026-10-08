#!/usr/bin/env bash
# Deploy script for Vercel from site directory
# install-vercel-deps.sh handles package.json swap and npm install
# build-vercel.sh handles docs/DemoMount swaps and Next.js build

set -e

echo "Starting Vercel deployment..."

# Run the build (docs/DemoMount swaps + Next.js build)
./build-vercel.sh

echo "Deploy complete!"
