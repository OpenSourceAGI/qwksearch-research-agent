# Authentication 401 Error - Quick Fix Guide

## 🚨 Problem

User is logged in but getting **401 Unauthorized** errors:
- `/api/agent/chats` returns 401
- `/api/user` returns 401  
- User avatar upload fails with 401
- Chat history not loading

## ✅ Solution (5 minutes)

### Step 1: Create KV Namespace

```bash
cd apps/qwksearch-web

# Run the setup script
./scripts/setup-kv.sh
```

This will output two KV namespace IDs. **Copy them**.

### Step 2: Update wrangler.jsonc

The script will show you the sed commands to run, or manually edit `wrangler.jsonc`:

Find this section:
```jsonc
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "YOUR_KV_NAMESPACE_ID"  // 👈 Replace this
  }
],
```

And this section:
```jsonc
"env": {
  "production": {
    "kv_namespaces": [
      {
        "binding": "KV",
        "id": "YOUR_PRODUCTION_KV_NAMESPACE_ID"  // 👈 Replace this
      }
    ]
  }
}
```

### Step 3: Deploy

```bash
# Deploy to production
npm run deploy
```

### Step 4: Clear Browser Cookies (Important!)

After deploying, users need to:
1. **Log out** completely
2. **Clear cookies** for your domain (or use incognito mode)
3. **Log in again**

This ensures new sessions are created with the KV namespace.

## 🔍 Verify It's Fixed

### Check 1: KV Namespace Exists
```bash
wrangler kv key list --namespace-id=YOUR_KV_NAMESPACE_ID
```

Should show session keys after users log in.

### Check 2: Sessions in D1
```bash
wrangler d1 execute qwksearch-new --remote --command="SELECT COUNT(*) as session_count FROM session"
```

Should show active sessions.

### Check 3: Test API Endpoints

Open browser DevTools > Network tab, then:

1. **Load chat history:**
   - Navigate to chat page
   - Should see `GET /api/agent/chats` with status **200** ✅
   - Response should contain your chats

2. **Load user profile:**
   - Navigate to settings
   - Should see `GET /api/user` with status **200** ✅
   - Response should contain your user data

3. **Upload avatar:**
   - Try uploading profile picture
   - Should see `PATCH /api/user` with status **200** ✅

## 🐛 Still Not Working?

### Issue: "KV namespace not found"

**Error:** `wrangler: KV namespace with ID ... not found`

**Fix:**
```bash
# List all your KV namespaces
wrangler kv namespace list

# Use an existing ID or create a new one
wrangler kv namespace create "qwksearch-sessions"
```

### Issue: "User row not found" in logs

**Symptom:** Logs show session validation errors

**Fix:** Database was reset but KV sessions still exist
```bash
# Clear all KV sessions (forces re-login)
wrangler kv key list --namespace-id=YOUR_KV_ID | 
  jq -r '.[].name' | 
  xargs -I {} wrangler kv key delete {} --namespace-id=YOUR_KV_ID
```

### Issue: Chats saved but not showing in history

**Symptom:** Can chat but `/api/agent/chats` returns empty array

**Debug:**
```bash
# Check if chats have userId set
wrangler d1 execute qwksearch-new --remote \
  --command="SELECT id, userId, title FROM chats ORDER BY createdAt DESC LIMIT 10"
```

If `userId` is `NULL`, that's the problem. **Fix:**
1. Clear browser cookies
2. Log in again
3. Create new chats (old chats without userId won't show)

### Issue: CORS errors on auth endpoints

**Symptom:** Browser shows CORS policy errors

**Fix:** Check `NEXT_PUBLIC_BASE_URL` in `.env` matches your deployment URL:
```bash
# For production
NEXT_PUBLIC_BASE_URL=https://qwksearch.com

# For local dev
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📊 Understanding the Flow

```
User Request (with session cookie)
    ↓
[getSession() in session.ts]
    ↓
1. Read session token from cookie
2. Check KV for session data ← ❌ THIS WAS FAILING (no KV binding)
3. Fallback to D1 if not in KV
4. Validate user exists in D1
    ↓
[requireUserId()]
    ↓
Session valid? → Execute API request
Session invalid? → Return 401
```

**Before fix:** Step 2 failed silently (no KV binding), so sessions weren't cached
**After fix:** Sessions cached in KV, auth checks pass ✅

## 📚 Related Documentation

- [Full Auth Setup Guide](./AUTH_SETUP.md) - Complete technical documentation
- [OpenRouter Free Models](../../docs/OPENROUTER_FREE_MODELS.md) - Model configuration

## 🎯 Prevention

To avoid this in the future:

1. **Always run verification before deploying:**
   ```bash
   ./scripts/verify-auth.sh
   ```

2. **Include KV setup in deployment checklist:**
   - [ ] KV namespace created
   - [ ] IDs added to wrangler.jsonc
   - [ ] D1 database schema up to date
   - [ ] Environment variables set
   - [ ] Test auth flow after deploy

3. **Monitor for auth errors:**
   ```bash
   wrangler pages deployment tail --project-name=qwksearch
   ```
   Watch for 401 errors or "session user has no user row" warnings.

## ✨ Success Indicators

You'll know it's working when:
- ✅ No 401 errors in browser DevTools
- ✅ Chat history loads immediately
- ✅ User settings page shows profile data
- ✅ Avatar upload works
- ✅ Chats persist across page refreshes
- ✅ `wrangler kv key list` shows session keys

---

**Need more help?** Check the full [AUTH_SETUP.md](./AUTH_SETUP.md) guide or review the code:
- [lib/auth/session.ts](../lib/auth/session.ts) - Session validation logic
- [app/api/agent/chats/route.ts](../app/api/agent/chats/route.ts) - Chat history endpoint
