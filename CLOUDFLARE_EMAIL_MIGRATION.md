# Cloudflare Email Service Migration

## Summary
Replaced Resend with Cloudflare's native Email Service for the magic link authentication flow in the Worker. This uses the native Cloudflare Email Service binding instead of an external API.

## Changes Made

### 1. **lib/auth/index.ts**
- Removed Resend SDK import and initialization
- Added Cloudflare Email Service `Env` interface with `EMAIL.send()` binding
- Updated `magicLink()` plugin to use `getCloudflareContext()` and access `env.EMAIL`
- Email is now sent via `env.EMAIL.send({ from, to, subject, html })`
- Added error handling with logging

### 2. **wrangler.jsonc**
Added Email Service binding configuration:
```jsonc
"send_email": [
  {
    "name": "EMAIL",
    "destination_address": "noreply@qwksearch.com",
  },
]
```

## Setup Checklist

Before deploying, complete these steps:

1. **Onboard sending domain in Cloudflare**
   - Go to Cloudflare Dashboard → Compute → Email Service → Email Sending
   - Add your domain (e.g., `qwksearch.com`)
   - Cloudflare will add SPF, DKIM, DMARC records and a `cf-bounce` DNS record
   - Wait for records to be verified

2. **Update wrangler.jsonc** ✅
   - Already added `send_email` binding with `destination_address: noreply@qwksearch.com`
   - Adjust `destination_address` if needed for your sender email

3. **Remove Resend**
   - From `package.json`: Remove `resend` dependency
   - Run `npm install` or `bun install`

4. **Test locally**
   - Run `npx wrangler dev` or `bun run dev`
   - Trigger a magic link sign-in
   - Check logs for success or error

5. **Deploy**
   - Run `npm run build` or `wrangler deploy`
   - Monitor Cloudflare logs for email delivery status

## Email Flow

1. User requests magic link → `magicLink()` plugin is triggered
2. Plugin calls `env.EMAIL.send({from, to, subject, html})`
3. Cloudflare Email Service queues and sends the email
4. Response includes `{ id: string }` for tracking (optional)

## Limits & Gotchas

- **Max 50 combined recipients** per email
- **Max 32 attachments** per email
- **Max 5 MiB total message size** including attachments
- Sender domain **must be verified** or sends fail with `E_SENDER_NOT_VERIFIED`
- Sender email **must match allowed senders** on the binding
- If `destination_address` is set, only emails to that address will send (useful for testing)

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `E_SENDER_NOT_VERIFIED` | Domain not onboarded in Cloudflare | Onboard domain in Email Service dashboard |
| `E_SENDER_DOMAIN_NOT_AVAILABLE` | Domain config incomplete | Ensure all DNS records are verified |
| `E_RECIPIENT_NOT_ALLOWED` | Email outside `destination_address` | Update binding or remove restriction |
| `EMAIL binding not configured` | `send_email` missing from wrangler.jsonc | Add binding to config |

## References

- [Cloudflare Email Service Docs](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Workers Email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Better Auth Magic Link Plugin](https://www.better-auth.com/docs/plugins/magic-link)
