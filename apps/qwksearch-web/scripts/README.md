# QwkSearch Setup Scripts

Automated configuration scripts for QwkSearch deployment and authentication.

## Scripts Overview

### 🔐 setup-auth-secret.sh
**Purpose**: Configure Better Auth secret for Cloudflare Workers

**Usage**:
```bash
./scripts/setup-auth-secret.sh
```

**What it does**:
- Generates a cryptographically secure 32-byte Base64 secret
- Sets `BETTER_AUTH_SECRET` in Cloudflare Workers
- Updates local `.env` file
- Required for session authentication to work

**When to run**:
- First-time deployment
- After seeing "Invalid Base64 character" errors
- When rotating secrets for security

---

### 🗄️ setup-kv.sh
**Purpose**: Create and configure Cloudflare KV namespace

**Usage**:
```bash
./scripts/setup-kv.sh
```

**What it does**:
- Creates a new KV namespace for session storage
- Updates `wrangler.jsonc` with the KV ID
- Required for Better Auth session persistence

**When to run**:
- First-time deployment
- When KV namespace is not configured

---

### ✅ verify-auth.sh
**Purpose**: Verify authentication setup and configuration

**Usage**:
```bash
./scripts/verify-auth.sh
```

**What it checks**:
1. KV namespace configuration
2. D1 database binding
3. Environment variables (including `BETTER_AUTH_SECRET`)
4. Database schema files
5. Auth implementation files
6. Cloudflare Workers secrets

**Output**: Detailed status report with actionable next steps

**When to run**:
- Before deployment
- When troubleshooting auth issues
- After configuration changes

---

### 🔍 verify-openrouter.sh
**Purpose**: Verify OpenRouter API configuration for free models

**Usage**:
```bash
./scripts/verify-openrouter.sh
```

**What it checks**:
- OpenRouter API key configuration
- Free model availability
- API connectivity

**When to run**:
- When configuring AI models
- When troubleshooting model access issues

---

## Quick Start

### First-Time Setup

1. **Configure KV namespace**:
   ```bash
   ./scripts/setup-kv.sh
   ```

2. **Set up auth secret**:
   ```bash
   ./scripts/setup-auth-secret.sh
   ```

3. **Verify configuration**:
   ```bash
   ./scripts/verify-auth.sh
   ```

4. **Deploy**:
   ```bash
   cd ../..
   npm run deploy
   ```

### Troubleshooting Auth Issues

If you see errors like:
- `Invalid Base64 character: .`
- `BETTER_AUTH_SECRET is not defined`
- `Session validation failed`

**Run**:
```bash
./scripts/setup-auth-secret.sh
./scripts/verify-auth.sh
```

Then redeploy.

---

## Environment Requirements

### Required Tools
- **wrangler** (Cloudflare CLI): `npm install -g wrangler`
- **openssl**: Pre-installed on most Unix systems
- **bash**: Unix shell (WSL on Windows)

### Authentication
Ensure you're logged in to Cloudflare:
```bash
wrangler login
```

---

## Script Permissions

Make scripts executable if needed:
```bash
chmod +x scripts/*.sh
```

---

## Related Documentation

- **[AUTH_SECRET_FIX.md](../docs/AUTH_SECRET_FIX.md)** - Detailed auth secret configuration guide
- **[OPENROUTER_GUEST_ACCESS.md](../docs/OPENROUTER_GUEST_ACCESS.md)** - OpenRouter setup for free models
- **[.env.example](../.env.example)** - Environment variable reference

---

## Security Notes

1. **Never commit secrets to git** - All `.env` files are gitignored
2. **Use different secrets per environment** - Dev and production should have separate secrets
3. **Rotate secrets periodically** - Regenerate every 90 days
4. **Check secret format** - Must be Base64 (no special characters except `+`, `/`, `=`)

---

## Support

If scripts fail or you encounter issues:

1. Check you're in the correct directory: `apps/qwksearch-web`
2. Verify wrangler is logged in: `wrangler whoami`
3. Check project name matches: `wrangler.jsonc` → `name: "qwksearch"`
4. Review error messages carefully
5. Check [AUTH_SECRET_FIX.md](../docs/AUTH_SECRET_FIX.md) for detailed troubleshooting

---

## Contributing

When adding new setup scripts:
1. Follow existing naming pattern: `setup-*.sh` or `verify-*.sh`
2. Make scripts idempotent (safe to run multiple times)
3. Add error handling and clear success/failure messages
4. Update this README with script details
5. Test on clean environment before committing
