#!/bin/bash

# Cloudflare Puppeteer Scraper Setup Script
# This script helps you deploy the scraper to Cloudflare Workers

set -e

echo "🚀 Cloudflare Puppeteer Scraper Setup"
echo "======================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔐 Authentication Setup"
echo "----------------------"
read -p "Do you want to set up an API key for the scraper? (y/n): " setup_auth

if [ "$setup_auth" = "y" ] || [ "$setup_auth" = "Y" ]; then
    echo ""
    echo "Setting SCRAPER_API_KEY..."
    npx wrangler secret put SCRAPER_API_KEY

    echo ""
    echo "⚠️  IMPORTANT: Add this API key to your qwksearch-web .env.local:"
    echo "   SCRAPER_API_KEY=<the-key-you-just-entered>"
fi

echo ""
echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the deployed URL (shown above)"
echo "2. Add to apps/qwksearch-web/.env.local:"
echo "   SCRAPER_URL=<your-worker-url>"
if [ "$setup_auth" = "y" ] || [ "$setup_auth" = "Y" ]; then
    echo "   SCRAPER_API_KEY=<your-api-key>"
fi
echo ""
echo "3. Restart your Next.js development server"
echo ""
echo "📖 Documentation:"
echo "   - Integration guide: ./INTEGRATION.md"
echo "   - Feature docs: ./readme.md"
echo "   - API docs: Visit <your-worker-url>/swagger"
echo ""
