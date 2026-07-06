#!/bin/bash
#
# Verify OpenRouter Guest Access Configuration
#
# This script checks that OpenRouter is properly configured as the default
# provider for guests and new users with Nemotron as the default model.
#

set -e

echo "=========================================="
echo "OpenRouter Configuration Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to app directory
cd "$(dirname "$0")/.."

# Check 1: Environment variable exists
echo "1. Checking OPENROUTER_API_KEY environment variable..."
if grep -q "^OPENROUTER_API_KEY=sk-or-v1-" .env 2>/dev/null; then
  echo -e "${GREEN}✓ OPENROUTER_API_KEY found in .env${NC}"
elif grep -q "^OPENROUTER_API_KEY=sk-or-v1-" .env.local 2>/dev/null; then
  echo -e "${GREEN}✓ OPENROUTER_API_KEY found in .env.local${NC}"
else
  echo -e "${RED}✗ OPENROUTER_API_KEY not found or invalid format${NC}"
  echo "  Expected: OPENROUTER_API_KEY=sk-or-v1-..."
  echo "  Check: .env or .env.local"
  exit 1
fi
echo ""

# Check 2: Default model is Nemotron
echo "2. Checking default model in language-models-database.ts..."
if grep -A 5 '"provider": "OpenRouter"' packages/agent-toolkit/src/config/language-models-database.ts | grep -q '"default": "nvidia/nemotron-3-super-120b-a12b:free"'; then
  echo -e "${GREEN}✓ Default model is nvidia/nemotron-3-super-120b-a12b:free${NC}"
else
  echo -e "${RED}✗ Default model is not Nemotron${NC}"
  echo "  Expected: nvidia/nemotron-3-super-120b-a12b:free"
  grep -A 5 '"provider": "OpenRouter"' packages/agent-toolkit/src/config/language-models-database.ts | grep default
  exit 1
fi
echo ""

# Check 3: OpenRouter prioritization in model-registry.ts
echo "3. Checking OpenRouter prioritization in model-registry.ts..."
if grep -q 'providers.find((p) => p.name.toLowerCase().includes("openrouter"))' packages/agent-toolkit/src/config/model-registry.ts; then
  echo -e "${GREEN}✓ OpenRouter is prioritized for guests${NC}"
else
  echo -e "${RED}✗ OpenRouter prioritization not found${NC}"
  exit 1
fi
echo ""

# Check 4: Provider configuration exists
echo "4. Checking OpenRouter provider configuration..."
if grep -q '"key": "openrouter"' packages/agent-toolkit/src/config/provider-ui-config.ts; then
  echo -e "${GREEN}✓ OpenRouter provider configuration exists${NC}"
else
  echo -e "${RED}✗ OpenRouter provider configuration missing${NC}"
  exit 1
fi
echo ""

# Check 5: Environment variable mapping
echo "5. Checking OPENROUTER_API_KEY environment variable mapping..."
if grep -A 10 'getOpenRouterConfigFields' packages/agent-toolkit/src/config/provider-ui-config.ts | grep -q 'env: "OPENROUTER_API_KEY"'; then
  echo -e "${GREEN}✓ OPENROUTER_API_KEY is mapped correctly${NC}"
else
  echo -e "${RED}✗ OPENROUTER_API_KEY mapping not found${NC}"
  exit 1
fi
echo ""

# Check 6: Rate limiting is enabled
echo "6. Checking guest rate limiting..."
if grep -q 'isProviderEnvBased' apps/qwksearch-web/lib/chat/handler.ts; then
  echo -e "${GREEN}✓ Guest rate limiting is enabled${NC}"
else
  echo -e "${YELLOW}⚠ Guest rate limiting may not be configured${NC}"
fi
echo ""

# Check 7: Wrangler production config
echo "7. Checking Cloudflare Pages production configuration..."
if grep -q '"keep_vars": true' wrangler.jsonc; then
  echo -e "${GREEN}✓ keep_vars is enabled in wrangler.jsonc${NC}"
else
  echo -e "${YELLOW}⚠ keep_vars not enabled - environment variables may not persist${NC}"
fi
echo ""

# Check 8: Documentation exists
echo "8. Checking documentation..."
if [ -f "docs/OPENROUTER_GUEST_ACCESS.md" ]; then
  echo -e "${GREEN}✓ OPENROUTER_GUEST_ACCESS.md exists${NC}"
else
  echo -e "${YELLOW}⚠ Documentation file not found${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✓ All critical checks passed!${NC}"
echo "=========================================="
echo ""
echo "Configuration Summary:"
echo "  • Provider: OpenRouter (https://openrouter.ai)"
echo "  • Default Model: NVIDIA Nemotron 3 Super 120B"
echo "  • Context Length: 1,000,000 tokens"
echo "  • Cost: \$0 per 1M tokens (free)"
echo "  • Daily Limits: None"
echo "  • Guest Access: Enabled with rate limiting"
echo ""
echo "Next Steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Test API: curl http://localhost:3000/api/agent/providers"
echo "  3. Verify in UI: Open http://localhost:3000 and start a chat"
echo ""
echo "For deployment to Cloudflare Pages:"
echo "  1. Set secret: npx wrangler secret put OPENROUTER_API_KEY"
echo "  2. Deploy: npm run deploy"
echo "  3. Verify: curl https://your-domain.pages.dev/api/agent/providers"
echo ""
