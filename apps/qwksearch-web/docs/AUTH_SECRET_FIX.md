# Better Auth Secret Configuration Fix

## Problem

**Error**: `Invalid Base64 character: .` in Better Auth session validation

**Root Cause**: The `BETTER_AUTH_SECRET` environment variable is not properly configured in Cloudflare Workers, causing session token decryption to fail.

## Why This Happens

Better Auth uses a secret key to:
1. Encrypt session tokens
2. Sign cookies
3. Validate authentication state

When the secret is missing, improperly formatted, or contains invalid Base64 characters, Better Auth cannot decrypt session tokens, resulting in the error:

```
ERROR [Better Auth]: INTERNAL_SERVER_ERROR Error: Invalid Base64 character: .
```

## Solution

### Option 1: Automated Setup (Recommended)

Run the setup script to generate and configure the secret automatically:

```bash
cd apps/qwksearch-web
./scripts/setup-auth-secret.sh
```

This script will:
1. Generate a cryptographically secure 32-byte Base64-encoded secret
2. Set it as a Cloudflare Workers secret
3. Update your local `.env` file

### Option 2: Manual Setup

#### Step 1: Generate a secure secret

```bash
openssl rand -base64 32
```

Example output: `xK8vN2pQ7mL5wT9dF3hR6sU4yE1cA8bJ0oI9uY7tP2q=`

#### Step 2: Set the secret in Cloudflare Workers

```bash
# Using wrangler CLI
echo "YOUR_GENERATED_SECRET" | wrangler secret put BETTER_AUTH_SECRET

# Or via Cloudflare Dashboard:
# Workers & Pages > qwksearch > Settings > Environment Variables
# Add secret: BETTER_AUTH_SECRET = YOUR_GENERATED_SECRET
```

#### Step 3: Update local .env file

Add to your `.env` file:

```env
BETTER_AUTH_SECRET=YOUR_GENERATED_SECRET
```

#### Step 4: Redeploy

```bash
npm run deploy
```

## Verification

### Check local configuration:

```bash
./scripts/verify-auth.sh
```

Should show:
```
✅ BETTER_AUTH_SECRET configured
```

### Check Cloudflare Workers secrets:

```bash
wrangler secret list
```

Should include:
```
BETTER_AUTH_SECRET
```

### Test the endpoint:

```bash
curl https://qwksearch.com/api/auth/get-session
```

Should return valid JSON (not an error).

## Important Notes

1. **Never commit the secret to git** - It's listed in `.gitignore`
2. **Use different secrets for dev/production** - Generate separate secrets for each environment
3. **Rotate secrets periodically** - Regenerate and update every 90 days for security
4. **Secret must be Base64-encoded** - Use `openssl rand -base64 32` to ensure proper encoding

## Environment Variable Priority

Better Auth checks for secrets in this order:
1. Cloudflare Workers secrets (production)
2. `process.env.BETTER_AUTH_SECRET` (local development)
3. `.env` file (fallback)

## Related Files

- **Configuration**: `lib/auth/index.ts` - Better Auth initialization
- **Environment**: `lib/env.ts` - Environment variable loading
- **Wrangler**: `wrangler.jsonc` - Cloudflare Workers config
- **Scripts**: 
  - `scripts/setup-auth-secret.sh` - Automated setup
  - `scripts/verify-auth.sh` - Configuration verification

## Troubleshooting

### Error persists after setting secret:

1. **Clear browser cookies** - Old sessions may still use invalid tokens
2. **Check secret format** - Must be Base64 (alphanumeric + `/` + `+` + `=`)
3. **Verify deployment** - Ensure `wrangler secret put` succeeded
4. **Check wrangler.jsonc** - Confirm project name matches deployed worker

### Secret not found in Workers:

```bash
# Login to wrangler
wrangler login

# Set secret again
echo "YOUR_SECRET" | wrangler secret put BETTER_AUTH_SECRET

# Verify
wrangler secret list
```

### Local development works but production fails:

- Cloudflare Workers secrets are separate from local `.env`
- Must set the secret via `wrangler secret put` for production
- Use `wrangler secret list` to verify it's deployed

## Security Best Practices

1. **Length**: Minimum 32 bytes (256 bits) for adequate security
2. **Randomness**: Use cryptographic random generators (`openssl rand`)
3. **Encoding**: Base64 ensures compatibility with environment variables
4. **Rotation**: Change secrets if compromised or every 90 days
5. **Access**: Limit who can view/modify Cloudflare Workers secrets

## References

- [Better Auth Documentation](https://better-auth.com/docs)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
