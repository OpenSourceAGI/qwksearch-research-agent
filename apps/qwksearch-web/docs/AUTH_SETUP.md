# Authentication & Session Storage Setup

## Problem Overview

The application uses **better-auth** with Cloudflare integration for authentication. Sessions are stored in **Cloudflare KV** (key-value store) for fast access, while user data and chat history are stored in **Cloudflare D1** (SQL database).

### Why KV is Required

- **Session tokens** need to be retrieved on every request (high read frequency)
- **KV provides low-latency access** (<10ms globally) compared to D1 queries
- **better-auth-cloudflare** uses KV as secondary storage for session caching
- Without KV, sessions fall back to D1-only, causing auth failures when the session table doesn't exist or is out of sync

## Current Issue

**Symptom:** 401 Unauthorized errors on authenticated endpoints (`/api/agent/chats`, `/api/user`)

**Root Cause:** The `wrangler.jsonc` file is missing the `kv_namespaces` binding configuration.

**Technical Details:**
- [lib/auth/index.ts:18](../lib/auth/index.ts#L18) attempts to read `KV` from `ctx.env`
- [lib/auth/session.ts:32-55](../lib/auth/session.ts#L32-L55) validates sessions against the D1 user table
- When KV is unavailable, sessions are not cached and auth checks fail silently

## Setup Instructions

### 1. Create KV Namespaces

Run the setup script to create KV namespaces for development and production:

```bash
cd apps/qwksearch-web
./scripts/setup-kv.sh
```

This will output two namespace IDs:
- Development KV ID (for local testing)
- Production KV ID (for deployed environment)

### 2. Update wrangler.jsonc

The script will provide sed commands to automatically update your config, or you can manually replace:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID"  // Replace with dev KV ID
    }
  ],
  "env": {
    "production": {
      "kv_namespaces": [
        {
          "binding": "KV",
          "id": "YOUR_PRODUCTION_KV_NAMESPACE_ID"  // Replace with prod KV ID
        }
      ]
    }
  }
}
```

### 3. Verify Database Schema

Ensure the D1 database has the required tables:

```bash
# Push schema to local database (development)
npm run db:push

# Push schema to D1 (production)
npm run db:push:d1
```

Required tables:
- `user` - User accounts
- `session` - Session tokens (synced with KV)
- `account` - OAuth provider accounts
- `chats` - Chat sessions with `userId` foreign key
- `messages` - Chat messages with `userId` foreign key

### 4. Test Locally

Start the dev server with Cloudflare bindings:

```bash
npm run dev:cf
```

This uses `wrangler dev --local` which provides access to KV and D1 bindings.

### 5. Deploy

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

For staging environment:

```bash
npm run deploy:staging
```

## How It Works

### Session Flow

1. **User logs in** → better-auth creates session in D1 `session` table
2. **Session cached in KV** → Token stored in KV for fast retrieval
3. **Subsequent requests** → Session retrieved from KV (or D1 fallback)
4. **Session validation** → User ID checked against D1 `user` table
5. **Stale session cleanup** → If user doesn't exist, session revoked from both KV and D1

### Database vs KV Storage

| Data Type | Storage | Why |
|-----------|---------|-----|
| User profile | D1 | Relational data, infrequent updates |
| Session tokens | KV + D1 | KV for speed, D1 for persistence |
| Chat history | D1 | Relational queries, foreign keys |
| Chat messages | D1 | Sequential ordering, pagination |

### Authentication Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/agent/chat
       ▼
┌──────────────────────────────────────┐
│  Session Middleware                  │
│  ├─ getSession()                     │
│  ├─ Read session token from cookies  │
│  └─ Verify against KV + D1           │
└──────┬───────────────────────────────┘
       │
       ├─ No session ──────► Guest (limited rate)
       │
       ├─ Valid session ───► Authenticated
       │                     └─ Load userId
       │                     └─ Save chat history
       │
       └─ Stale session ───► Revoke & redirect to login
```

## Troubleshooting

### Issue: 401 Unauthorized (User is logged in)

**Symptoms:**
- Browser shows user as authenticated
- API calls return 401
- Console errors: "Failed to fetch chat history: Error: HTTP 401"

**Diagnosis:**
```bash
# Check if KV binding is configured
grep -A 3 "kv_namespaces" wrangler.jsonc

# Check if session exists in KV
wrangler kv key list --binding=KV --namespace-id=YOUR_KV_ID

# Check if user exists in D1
wrangler d1 execute qwksearch-new --command="SELECT id, email FROM user"
```

**Solutions:**
1. Verify KV namespace is configured in `wrangler.jsonc`
2. Clear browser cookies and log in again
3. Ensure D1 database has up-to-date schema
4. Check that `userId` foreign keys are properly set on chats/messages tables

### Issue: Chats not being saved

**Symptoms:**
- Chats work but don't appear in history
- `/api/agent/chats` returns empty array

**Diagnosis:**
```bash
# Check if chats table exists
wrangler d1 execute qwksearch-new --command="SELECT * FROM chats LIMIT 5"

# Check if userId is being set
wrangler d1 execute qwksearch-new --command="SELECT id, userId, title FROM chats"
```

**Solutions:**
1. Ensure user is authenticated (check `getUserId()` returns non-null)
2. Verify `handleHistorySave()` is being called in chat handler
3. Check D1 database logs for foreign key constraint errors
4. Ensure `userId` column in `chats` table is properly set (not NULL)

### Issue: "User row not found" in logs

**Symptoms:**
- Logs show: `[auth] session user X has no user row; revoking stale session`
- User gets logged out automatically

**Cause:** Session exists in KV but user was deleted from D1 (e.g., database reset)

**Solution:**
```bash
# Clear all KV sessions
wrangler kv key list --binding=KV --namespace-id=YOUR_KV_ID | jq -r '.[].name' | xargs -I {} wrangler kv key delete {} --binding=KV --namespace-id=YOUR_KV_ID

# Have users log in again
```

## Environment Variables

Required in `.env` file:

```bash
# Auth providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional providers
AUTH_DISCORD_ID=your_discord_id
AUTH_DISCORD_SECRET=your_discord_secret
AUTH_LINKEDIN_ID=your_linkedin_id
AUTH_LINKEDIN_SECRET=your_linkedin_secret

# Base URL
NEXT_PUBLIC_BASE_URL=https://qwksearch.com

# Database (local dev only)
DATABASE_URL=file:./data/qwksearch.db
```

## Related Files

- [lib/auth/index.ts](../lib/auth/index.ts) - Auth configuration
- [lib/auth/session.ts](../lib/auth/session.ts) - Session validation
- [lib/database/schema.ts](../lib/database/schema.ts) - Database schema
- [lib/chat/handler.ts](../lib/chat/handler.ts) - Chat request handler
- [lib/chat/history.ts](../lib/chat/history.ts) - Chat history persistence
- [app/api/agent/chats/route.ts](../app/api/agent/chats/route.ts) - Chat list endpoint
- [app/api/user/route.ts](../app/api/user/route.ts) - User profile endpoint

## Testing Checklist

- [ ] KV namespace created and configured
- [ ] D1 database schema up to date
- [ ] User can sign in with Google OAuth
- [ ] Session persists across page refreshes
- [ ] Chat history saves for authenticated users
- [ ] `/api/agent/chats` returns user's chats
- [ ] `/api/user` returns user profile
- [ ] User avatar upload works
- [ ] Chat messages persist with correct `userId`
- [ ] Rate limiting works for guests
- [ ] Stale sessions are properly revoked
