import debug from 'debug';

import { emailEnv } from '@/envs/email';
import { getCfEnv } from '@/libs/cloudflare/env';

import { type EmailPayload, type EmailResponse, type EmailServiceImpl } from '../type';

const log = debug('lobe-email:Cloudflare');

/**
 * Email implementation backed by the Cloudflare Email Routing `send_email`
 * binding (`EMAIL` in wrangler.jsonc). This is the same transport QwkSearch
 * uses for its magic-link mail, so a single Worker configuration serves both.
 *
 * The binding only accepts a verified sender: configure `SMTP_FROM` (or
 * `RESEND_FROM`) with an address on a domain enabled for Email Routing.
 */
export class CloudflareEmailImpl implements EmailServiceImpl {
  async sendMail(payload: EmailPayload): Promise<EmailResponse> {
    const sender = getCfEnv()?.EMAIL;
    if (!sender) {
      throw new Error(
        'Cloudflare EMAIL binding is not configured. Add a `send_email` binding named EMAIL to wrangler.jsonc.',
      );
    }

    const from = payload.from || emailEnv.SMTP_FROM || emailEnv.RESEND_FROM;
    if (!from) {
      throw new Error(
        'Missing sender address. Provide payload.from or set SMTP_FROM to an Email Routing verified address.',
      );
    }

    if (!payload.html && !payload.text) {
      throw new Error('Cloudflare email requires either html or text content in the payload.');
    }

    if (payload.attachments?.length) {
      log('Attachments are not supported by the Email Routing binding; dropping %d attachment(s)', payload.attachments.length);
    }

    const result = await sender.send({
      from,
      html: payload.html,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      to: payload.to,
    });

    const messageId = (result && typeof result === 'object' && result.id) || crypto.randomUUID();
    log('Email sent via Cloudflare Email Routing: %s', messageId);

    return { messageId };
  }
}
