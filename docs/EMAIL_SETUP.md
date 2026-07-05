# Email Configuration Guide

This application uses **Cloudflare Email Service** via MailChannels for sending transactional emails (magic links for authentication).

## Why Cloudflare Email Service?

- ✅ **Free** - No cost for email sending on Cloudflare Workers
- ✅ **No API Key Required** - Works automatically when deployed to Cloudflare
- ✅ **Simplified Setup** - No third-party service integration needed
- ✅ **Reliable** - Built on Cloudflare's infrastructure

## Migration from Resend

We previously used Resend for email sending. The migration to Cloudflare Email Service removes the need for:
- `AUTH_RESEND_KEY` environment variable
- `resend` npm package dependency
- Third-party API key management

## Setup Instructions

### 1. Domain Configuration (Required for Production)

To send emails from your domain, you need to configure DNS records:

#### SPF Record

Add a TXT record to your domain:

```
Type: TXT
Name: @
Value: v=spf1 a mx include:relay.mailchannels.net ~all
```

If you already have an SPF record, add `include:relay.mailchannels.net` to it:

```
v=spf1 include:_spf.google.com include:relay.mailchannels.net ~all
```

#### DKIM (Optional but Recommended)

MailChannels provides DKIM signing automatically, but you can also add your own DKIM records for better deliverability.

### 2. Email Address Configuration

Update your sender email address in the site configuration:

**File:** `apps/qwksearch-web/lib/config/site.ts`

```typescript
export const APP_EMAIL = "noreply@yourdomain.com"
export const APP_NAME = "Your App Name"
```

Make sure the domain matches your SPF configuration.

### 3. Testing Locally

During local development, the email sending will still work but emails may be rejected by some providers without proper DNS configuration. For local testing:

1. Use a test email address you control
2. Check spam/junk folders
3. Consider using a development domain with proper DNS

### 4. Deployment

When deploying to Cloudflare Workers/Pages:

```bash
bun run deploy
```

The MailChannels integration works automatically - no additional configuration needed.

## How It Works

The magic link authentication sends an email using the MailChannels API:

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
    content: [
      {
        type: "text/html",
        value: `<p>Click the link below to sign in...</p>`,
      },
    ],
  }),
});
```

## Troubleshooting

### Emails Not Being Delivered

1. **Check SPF Record**: Verify your SPF record includes `relay.mailchannels.net`
   ```bash
   dig TXT yourdomain.com
   ```

2. **Check Spam Folder**: Initially, emails might land in spam

3. **Verify Sender Email**: Make sure `APP_EMAIL` uses your domain

4. **Check Cloudflare Deployment**: Email sending only works on Cloudflare Workers, not on traditional Node.js servers

### Local Development Issues

- Local development uses `http://localhost:3000` which may trigger spam filters
- Consider using a staging domain for development testing
- Check the browser console and server logs for error messages

## Email Templates

To customize the magic link email template, edit:

**File:** `apps/qwksearch-web/lib/auth/index.ts`

```typescript
magicLink({
  sendMagicLink: async ({ email, url }) => {
    // Customize the email content here
    const htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome to ${APP_NAME}</h2>
        <p>Click the button below to sign in:</p>
        <a href="${url}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Sign In
        </a>
        <p style="color: #666; font-size: 12px;">This link expires in 5 minutes.</p>
      </div>
    `;
    
    await fetch("https://api.mailchannels.net/tx/v1/send", {
      // ... send email
    });
  },
})
```

## Additional Resources

- [MailChannels Documentation](https://mailchannels.zendesk.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API)
- [Cloudflare Workers Email](https://developers.cloudflare.com/workers/examples/sending-email-from-workers/)
- [SPF Record Syntax](https://dmarcian.com/spf-syntax-table/)
