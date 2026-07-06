#!/bin/bash
# Setup KV namespaces for QwkSearch authentication

echo "Creating KV namespace for development..."
DEV_KV=$(wrangler kv namespace create "qwksearch-sessions" --preview false 2>&1)
DEV_KV_ID=$(echo "$DEV_KV" | grep -oP 'id = "\K[^"]+')

echo "Creating KV namespace for production..."
PROD_KV=$(wrangler kv namespace create "qwksearch-sessions" --env production --preview false 2>&1)
PROD_KV_ID=$(echo "$PROD_KV" | grep -oP 'id = "\K[^"]+')

echo ""
echo "✅ KV namespaces created successfully!"
echo ""
echo "Development KV ID: $DEV_KV_ID"
echo "Production KV ID: $PROD_KV_ID"
echo ""
echo "Update your wrangler.jsonc with these IDs:"
echo ""
echo "Replace 'YOUR_KV_NAMESPACE_ID' with: $DEV_KV_ID"
echo "Replace 'YOUR_PRODUCTION_KV_NAMESPACE_ID' with: $PROD_KV_ID"
echo ""
echo "To do this automatically, run:"
echo "  sed -i 's/YOUR_KV_NAMESPACE_ID/$DEV_KV_ID/g' wrangler.jsonc"
echo "  sed -i 's/YOUR_PRODUCTION_KV_NAMESPACE_ID/$PROD_KV_ID/g' wrangler.jsonc"
