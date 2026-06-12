# Hydration & Build Fixes Applied

## ✅ Fixed (2026-06-12)

### 1. SVG Icons → Image Optimizer 400s
**Problem**: Next.js Image optimizer rejecting SVG requests with 400 errors; server/client hydration mismatch.

**Fix**:
- Moved icons from `components/icons/*.svg` to `public/icons/*.svg`
- Updated imports to use public paths (`/icons/icon-name.svg`)
- Added `unoptimized` prop to all SVG `<Image>` components to bypass optimizer
- Files updated:
  - `components/layout/CategoryDock.tsx`
  - `components/Settings/SettingsButton.tsx`

### 2. `sanitize-html` → Node Dependency Externalization
**Problem**: `sanitize-html` (Node library) pulled into client bundle, causing `url.pathToFileURL` errors.

**Fix**:
- Replaced `sanitize-html` with `isomorphic-dompurify` (browser-safe)
- Updated `LexicalArticleViewer.tsx` to use DOMPurify API
- Removed `sanitize-html` from dependencies

## ⚠️ Remaining Issues (User Action Required)

### 3. CORS on `qwksearch.com/api/auth/get-session`
**Problem**: API missing `Access-Control-Allow-Origin` header for `localhost:3000`.

**Fix Options**:
1. Add CORS headers server-side with credentials support:
   ```js
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Credentials: true
   ```
2. **OR** proxy through Next.js (recommended for auth cookies):
   ```js
   // next.config.js
   async rewrites() {
     return [{ source: '/api/auth/:path*', destination: 'https://qwksearch.com/api/auth/:path*' }];
   }
   ```
   Then update better-auth `baseURL` to `/api/auth`.

### 4. Google Sign-In 403 (`gsi/status`)
**Problem**: OAuth client ID doesn't have `localhost:3000` registered.

**Fix**: Google Cloud Console → Credentials → [OAuth Client ID] → Add `http://localhost:3000` to Authorized JavaScript origins (5-10min propagation).

### 5. "No chat models found" Error
**Problem**: `chatConfig.ts:76` throws before any model is configured.

**Fix**: Either seed a default model in config initialization or make the check fail soft and redirect to settings instead of throwing.

## Build Notes
- Project uses pnpm workspaces (`workspace:*` protocol)
- Lock file: `pnpm-lock.yaml`
- Package manager override: Changed `package.json` from `npm@10.0.0` to `pnpm@9.0.0`
