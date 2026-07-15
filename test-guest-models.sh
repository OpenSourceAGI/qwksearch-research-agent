#!/bin/bash
# Test guest model filtering

set -e

BASE_URL="http://localhost:3000"

echo "=== Testing Guest Model Filtering ==="
echo ""

echo "1. Testing GUEST mode (?guest=true):"
echo "   Endpoint: $BASE_URL/api/agent/providers?guest=true"
curl -s "$BASE_URL/api/agent/providers?guest=true" | jq '.providers | map({name: .name, modelCount: (.chatModels | length)})'
echo ""

echo "2. Testing AUTHENTICATED mode (?guest=false):"
echo "   Endpoint: $BASE_URL/api/agent/providers?guest=false"
curl -s "$BASE_URL/api/agent/providers?guest=false" | jq '.providers | map({name: .name, modelCount: (.chatModels | length)})'
echo ""

echo "3. Testing AUTO-DETECTION (no session cookie):"
echo "   Endpoint: $BASE_URL/api/agent/providers"
curl -s "$BASE_URL/api/agent/providers" | jq '.isGuest'
echo ""

echo "4. Full guest model list:"
curl -s "$BASE_URL/api/agent/providers?guest=true" | jq '.providers[] | {name, models: (.chatModels | map(.key))}'
echo ""

echo "✓ Test complete"
