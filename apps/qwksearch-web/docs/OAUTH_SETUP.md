# OAuth Provider Setup

This guide explains how to configure OAuth providers for social sign-in.

## Overview

QwkSearch supports multiple OAuth providers:
- **Google** - Most common, recommended for general use
- **Discord** - Good for developer/gaming communities
- **LinkedIn** - Professional networks

If OAuth providers are not configured, users can still sign in using **Magic Link** (passwordless email authentication).

## Why OAuth Buttons Show 403 Error

The 403 Forbidden error occurs when:
1. OAuth provider credentials are not configured in `.env`
2. Credentials are still set to placeholder values (`your-google-client-id`, etc.)
3. The Better Auth library rejects requests for unconfigured providers

**Solution**: Either configure the OAuth providers properly, or the app will automatically hide the buttons for unconfigured providers.

---

## Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**

### 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (or Internal for Google Workspace)
3. Fill in required fields:
   - App name: `QwkSearch`
   - User support email: your email
   - Developer contact: your email
4. Add scopes (optional for basic auth):
   - `userinfo.email`
   - `userinfo.profile`
5. Add test users if in development

### 3. Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
5. Copy the **Client ID** and **Client Secret**

### 4. Update .env
```bash
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

---

## Discord OAuth Setup

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name (e.g., "QwkSearch")

### 2. Configure OAuth2
1. Go to **OAuth2** tab
2. Add redirects:
   ```
   http://localhost:3000/api/auth/callback/discord
   https://yourdomain.com/api/auth/callback/discord
   ```
3. Copy **Client ID** and **Client Secret**

### 3. Update .env
```bash
AUTH_DISCORD_ID=123456789012345678
AUTH_DISCORD_SECRET=abc123def456ghi789
```

---

## LinkedIn OAuth Setup

### 1. Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in required information
4. Verify the app

### 2. Configure OAuth Settings
1. Go to **Auth** tab
2. Add authorized redirect URLs:
   ```
   http://localhost:3000/api/auth/callback/linkedin
   https://yourdomain.com/api/auth/callback/linkedin
   ```
3. Request access to:
   - `r_liteprofile` (basic profile info)
   - `r_emailaddress` (email)

### 3. Get Credentials
1. Copy **Client ID** and **Client Secret** from the Auth tab

### 4. Update .env
```bash
AUTH_LINKEDIN_ID=abc123def456
AUTH_LINKEDIN_SECRET=ghi789jkl012
```

---

## Testing OAuth Configuration

### 1. Restart Development Server
```bash
npm run dev
```

### 2. Check Available Providers
The app automatically detects configured providers. Visit:
```
http://localhost:3000/api/auth/providers
```

You should see:
```json
{
  "providers": ["google", "discord", "linkedin"]
}
```

### 3. Test Sign In
1. Go to login page
2. Only configured providers will show buttons
3. Click a provider button - you should be redirected to OAuth consent
4. After authorization, you'll be redirected back to the app

---

## Production Deployment

### Update Redirect URIs
1. Add your production domain to all OAuth provider settings
2. Update `.env` for production:
   ```bash
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   BETTER_AUTH_URL=https://yourdomain.com
   ```

### Cloudflare Workers / Pages
The OAuth configuration works seamlessly with Cloudflare Workers deployment. Make sure to:
1. Set environment variables in Cloudflare dashboard
2. Use the same redirect URIs with your Cloudflare domain

---

## Troubleshooting

### 403 Forbidden on OAuth Button
- Check that credentials are properly configured in `.env`
- Ensure values are not placeholders (`your-google-client-id`)
- Restart dev server after changing `.env`
- Check browser console for specific error messages

### Redirect URI Mismatch
- Verify redirect URIs match exactly in OAuth provider settings
- Include both `http://localhost:3000` and production URLs
- Check `NEXT_PUBLIC_BASE_URL` matches the domain

### Provider Not Showing
- Check `/api/auth/providers` endpoint
- Verify environment variables are loaded (`console.log(process.env.GOOGLE_CLIENT_ID)`)
- Restart development server

### "Provider not configured"
This is the new user-friendly error message. It means:
- The OAuth provider is not set up in `.env`
- Users should use Magic Link email authentication instead
- Or contact the administrator to configure OAuth

---

## Disabling OAuth

To disable all OAuth and use only Magic Link authentication:

1. Remove or comment out all OAuth credentials in `.env`
2. The app will automatically hide OAuth buttons
3. Only the email Magic Link form will be shown

This is perfectly fine for development or internal tools where email-based authentication is sufficient.
