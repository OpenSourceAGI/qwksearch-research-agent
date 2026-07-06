#!/bin/bash
# Setup script for BETTER_AUTH_SECRET in Cloudflare Workers

echo "🔐 Better Auth Secret Setup"
echo "============================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "❌ Error: wrangler CLI not found"
  echo "   Install with: npm install -g wrangler"
  exit 1
fi

# Generate a secure random secret
echo "1️⃣ Generating secure random secret..."
SECRET=$(openssl rand -base64 32)
echo "   ✅ Generated secret (32 bytes, base64-encoded)"
echo ""

# Ask user for confirmation
echo "2️⃣ Secret will be set in Cloudflare Workers"
echo "   Project: qwksearch (from wrangler.jsonc)"
echo ""
echo "   The secret is: $SECRET"
echo ""
read -p "   Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   ❌ Cancelled"
  exit 0
fi

# Set the secret using wrangler
echo "3️⃣ Setting BETTER_AUTH_SECRET in Cloudflare Workers..."
echo "$SECRET" | wrangler secret put BETTER_AUTH_SECRET

if [ $? -eq 0 ]; then
  echo "   ✅ Secret successfully set"
  echo ""

  # Add to local .env if it exists
  if [ -f .env ]; then
    echo "4️⃣ Updating local .env file..."

    # Check if BETTER_AUTH_SECRET already exists
    if grep -q "^BETTER_AUTH_SECRET=" .env; then
      # Update existing line
      sed -i.bak "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|" .env
      echo "   ✅ Updated existing BETTER_AUTH_SECRET in .env"
    else
      # Append new line
      echo "" >> .env
      echo "BETTER_AUTH_SECRET=$SECRET" >> .env
      echo "   ✅ Added BETTER_AUTH_SECRET to .env"
    fi
  else
    echo "   ⚠️  No .env file found (skipping local update)"
  fi

  echo ""
  echo "✅ Setup complete!"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Redeploy your Worker: npm run deploy"
  echo "   2. The secret is now available in your Worker environment"
  echo ""
  echo "🔍 To verify:"
  echo "   wrangler secret list"
  echo ""
else
  echo "   ❌ Failed to set secret"
  echo "   Try running: wrangler login"
  exit 1
fi
