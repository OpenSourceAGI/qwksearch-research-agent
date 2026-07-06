# Migration Guide: Resend to Cloudflare Email Service

This guide helps you migrate from Resend to Cloudflare Email Service (MailChannels).

## Why Migrate?

- **Cost Savings**: Cloudflare Email Service is free (no per-email charges)
- **Simplified Setup**: No third-party API key needed
- **Better Integration**: Native integration with Cloudflare Workers
- **Same Reliability**: Built on Cloudflare's infrastructure

## Migration Steps

### Step 1: Update Dependencies

The `resend` package has been removed. Update your dependencies:

```bash
bun install
```

### Step 2: Remove Environment Variables

Remove from your `.env` and `.env.local` files:

```bash
# REMOVE THIS LINE
AUTH_RESEND_KEY=re_...
```

### Step 3: Configure DNS Records

Add SPF record to your domain's DNS:

**For new domains:**
```
Type: TXT
Name: @
Value: v=spf1 a mx include:relay.mailchannels.net ~all
```

**If you already have an SPF record:**
```
# Add include:relay.mailchannels.net to your existing record
v=spf1 include:_spf.google.com include:relay.mailchannels.net ~all
```

### Step 4: Verify Email Address

Update the sender email in `apps/qwksearch-web/lib/config/site.ts`:

```typescript
export const APP_EMAIL = "noreply@yourdomain.com"  // Must match your domain
export const APP_NAME = "Your App Name"
```

### Step 5: Test Locally

Start the dev server:

```bash
bun run dev
```

Try the magic link authentication:
1. Go to http://localhost:3000
2. Click "Sign in"
3. Enter your email
4. Check your inbox (and spam folder)

**Note:** During local development, emails may be rejected without proper DNS configuration.

### Step 6: Deploy to Cloudflare

Deploy to Cloudflare Workers/Pages:

```bash
bun run deploy
```

The MailChannels integration works automatically in production.

### Step 7: Test in Production

After deployment:
1. Visit your production URL
2. Try magic link authentication
3. Verify emails arrive within seconds
4. Check they don't land in spam

## Code Changes (Already Done)

The following changes have already been made to the codebase:

### Before (Resend):
```typescript
import { Resend } from "resend";

const resend = new Resend(getEnv("AUTH_RESEND_KEY"));
await resend.emails.send({
  from: `${APP_NAME} <${APP_EMAIL}>`,
  to: email,
  subject: `Sign in to ${APP_NAME}`,
  html: `<p>Click the link...</p>`,
});
```

### After (Cloudflare Email Service):
```typescript
await fetch("https://api.mailchannels.net/tx/v1/send", {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: APP_EMAIL, name: APP_NAME },
    subject: `Sign in to ${APP_NAME}`,
    content: [{
      type: "text/html",
      value: `<p>Click the link...</p>`,
    }],
  }),
});
```

## Troubleshooting

### Emails not sending

**Problem:** Emails aren't being delivered

**Solutions:**
1. Verify SPF record is configured correctly:
   ```bash
   dig TXT yourdomain.com
   ```
2. Check that `APP_EMAIL` uses your domain
3. Verify you're deployed to Cloudflare Workers
4. Check Cloudflare Workers logs for errors

### Emails going to spam

**Problem:** Emails land in spam folder

**Solutions:**
1. Add DKIM records (improves deliverability)
2. Warm up your domain (send gradually increasing volumes)
3. Use a professional email template
4. Ensure SPF record is correct

### Local development not working

**Problem:** Emails don't send during local development

**Solutions:**
1. This is expected - MailChannels works best on Cloudflare Workers
2. For local testing:
   - Deploy to a staging environment on Cloudflare
   - Use a test/development subdomain with DNS configured
   - Check server logs for error messages

### API errors

**Problem:** `fetch` errors when sending email

**Solutions:**
1. Check internet connectivity
2. Verify DNS is propagated (can take 24-48 hours)
3. Check MailChannels status page
4. Review request payload format

## Rollback Plan

If you need to rollback to Resend:

### 1. Reinstall Resend
```bash
bun add resend
```

### 2. Restore Environment Variable
```bash
# Add back to .env
AUTH_RESEND_KEY=re_...
```

### 3. Revert Code Changes

In `apps/qwksearch-web/lib/auth/index.ts`:

```typescript
import { Resend } from "resend";

// In magicLink sendMagicLink function:
const resend = new Resend(getEnv("AUTH_RESEND_KEY"));
await resend.emails.send({
  from: `${APP_NAME} <${APP_EMAIL}>`,
  to: email,
  subject: `Sign in to ${APP_NAME}`,
  html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
});
```

## Cost Comparison

### Before (Resend):
- **Free Tier**: 100 emails/day, 3,000/month
- **Paid**: $20/month for 50,000 emails
- **Overage**: $1 per 1,000 emails

### After (Cloudflare Email Service):
- **Free**: Unlimited emails (within Workers limits)
- **Cost**: $0 (included with Workers)
- **Overage**: No overage charges

**Estimated Savings**: $20-100+/month depending on volume

## Support

For issues with:
- **DNS Configuration**: Check your domain registrar's documentation
- **Cloudflare Workers**: [Cloudflare Community](https://community.cloudflare.com)
- **MailChannels**: [MailChannels Support](https://mailchannels.zendesk.com)
- **This App**: Open an issue in the repository

## Additional Resources

- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Full email configuration guide
- [MailChannels API Docs](https://mailchannels.zendesk.com/hc/en-us/articles/4565898358413)
- [Cloudflare Workers Email](https://developers.cloudflare.com/workers/examples/sending-email-from-workers/)
- [SPF Record Checker](https://mxtoolbox.com/spf.aspx)
