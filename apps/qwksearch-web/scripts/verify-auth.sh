#!/bin/bash
# Verification script for QwkSearch authentication setup

echo "🔍 QwkSearch Authentication Setup Verification"
echo "=============================================="
echo ""

# Check wrangler.jsonc for KV binding
echo "1️⃣ Checking wrangler.jsonc for KV namespace..."
if grep -q "kv_namespaces" wrangler.jsonc; then
  echo "   ✅ KV namespace configured"
  KV_ID=$(grep -A 2 "kv_namespaces" wrangler.jsonc | grep "id" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  if [ "$KV_ID" = "YOUR_KV_NAMESPACE_ID" ] || [ -z "$KV_ID" ]; then
    echo "   ❌ KV namespace ID is placeholder - run ./scripts/setup-kv.sh"
  else
    echo "   ✅ KV namespace ID: $KV_ID"
  fi
else
  echo "   ❌ No KV namespace configured - run ./scripts/setup-kv.sh"
fi
echo ""

# Check D1 database binding
echo "2️⃣ Checking D1 database binding..."
if grep -q "d1_databases" wrangler.jsonc; then
  echo "   ✅ D1 database configured"
  DB_NAME=$(grep -A 2 "d1_databases" wrangler.jsonc | grep "database_name" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  echo "   ✅ Database name: $DB_NAME"
else
  echo "   ❌ No D1 database configured"
fi
echo ""

# Check environment variables
echo "3️⃣ Checking environment variables..."
if [ -f .env ]; then
  if grep -q "BETTER_AUTH_SECRET" .env && [ "$(grep 'BETTER_AUTH_SECRET' .env | cut -d '=' -f2)" != "your-secret-key-here" ]; then
    echo "   ✅ BETTER_AUTH_SECRET configured"
  else
    echo "   ❌ BETTER_AUTH_SECRET missing or is placeholder"
    echo "      Run: ./scripts/setup-auth-secret.sh"
  fi

  if grep -q "GOOGLE_CLIENT_ID" .env; then
    echo "   ✅ GOOGLE_CLIENT_ID configured"
  else
    echo "   ❌ GOOGLE_CLIENT_ID missing"
  fi

  if grep -q "GOOGLE_CLIENT_SECRET" .env; then
    echo "   ✅ GOOGLE_CLIENT_SECRET configured"
  else
    echo "   ❌ GOOGLE_CLIENT_SECRET missing"
  fi

  if grep -q "NEXT_PUBLIC_BASE_URL" .env; then
    BASE_URL=$(grep "NEXT_PUBLIC_BASE_URL" .env | cut -d '=' -f2)
    echo "   ✅ Base URL: $BASE_URL"
  else
    echo "   ⚠️  NEXT_PUBLIC_BASE_URL not set (will default to localhost)"
  fi
else
  echo "   ❌ .env file not found"
fi
echo ""

# Check database schema files
echo "4️⃣ Checking database schema..."
if [ -d "drizzle" ]; then
  MIGRATION_COUNT=$(ls -1 drizzle/*.sql 2>/dev/null | wc -l)
  echo "   ✅ Drizzle migrations found: $MIGRATION_COUNT files"
else
  echo "   ⚠️  No drizzle directory found"
fi
echo ""

# Check if auth files exist
echo "5️⃣ Checking auth implementation files..."
AUTH_FILES=(
  "lib/auth/index.ts"
  "lib/auth/session.ts"
  "lib/database/schema.ts"
  "app/api/user/route.ts"
  "app/api/agent/chats/route.ts"
)

for file in "${AUTH_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file missing"
  fi
done
echo ""

# Check Cloudflare Workers secrets
echo "6️⃣ Checking Cloudflare Workers secrets..."
if command -v wrangler &> /dev/null; then
  echo "   Checking deployed secrets..."
  SECRET_LIST=$(wrangler secret list 2>&1)
  if echo "$SECRET_LIST" | grep -q "BETTER_AUTH_SECRET"; then
    echo "   ✅ BETTER_AUTH_SECRET is set in Cloudflare"
  else
    echo "   ❌ BETTER_AUTH_SECRET not found in Cloudflare"
    echo "      Run: ./scripts/setup-auth-secret.sh"
  fi
else
  echo "   ⚠️  wrangler CLI not found (cannot check deployed secrets)"
fi
echo ""

# Provide next steps
echo "📋 Next Steps:"
echo "=============="
echo ""

if grep -q "YOUR_KV_NAMESPACE_ID" wrangler.jsonc 2>/dev/null; then
  echo "❗ REQUIRED: Set up KV namespace"
  echo "   Run: ./scripts/setup-kv.sh"
  echo ""
fi

if [ ! -f .env ]; then
  echo "❗ REQUIRED: Create .env file"
  echo "   Run: cp .env.example .env"
  echo "   Then edit .env with your OAuth credentials"
  echo ""
fi

if [ -f .env ] && ! grep -q "BETTER_AUTH_SECRET" .env; then
  echo "❗ REQUIRED: Set up Better Auth secret"
  echo "   Run: ./scripts/setup-auth-secret.sh"
  echo ""
fi

echo "🚀 To test locally:"
echo "   npm run db:push         # Set up local database"
echo "   npm run dev:cf          # Start dev server with Cloudflare bindings"
echo ""

echo "🌐 To deploy:"
echo "   npm run build           # Build the application"
echo "   npm run deploy          # Deploy to Cloudflare Pages"
echo ""

echo "🔍 To diagnose production issues:"
echo "   wrangler kv key list --namespace-id=YOUR_KV_ID"
echo "   wrangler d1 execute $DB_NAME --command='SELECT * FROM user LIMIT 5'"
echo "   wrangler d1 execute $DB_NAME --command='SELECT * FROM session LIMIT 5'"
echo "   wrangler d1 execute $DB_NAME --command='SELECT id, userId, title FROM chats LIMIT 5'"
echo ""
