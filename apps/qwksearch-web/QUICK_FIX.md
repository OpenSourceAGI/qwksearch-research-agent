# Quick Fix: Better Auth "Invalid Base64" Error

## The Error
```
ERROR [Better Auth]: INTERNAL_SERVER_ERROR Error: Invalid Base64 character: .
```

## The Fix (30 seconds)

```bash
cd apps/qwksearch-web
./scripts/setup-auth-secret.sh
npm run deploy
```

## What This Does
1. Generates a secure random secret
2. Sets `BETTER_AUTH_SECRET` in Cloudflare Workers
3. Updates your local `.env` file
4. Fixes authentication errors

## Verify It Worked
```bash
./scripts/verify-auth.sh
```

Should show: `✅ BETTER_AUTH_SECRET configured`

## Still Having Issues?

See detailed docs: [AUTH_SECRET_FIX.md](docs/AUTH_SECRET_FIX.md)

---

**That's it!** Your authentication should now work correctly.
