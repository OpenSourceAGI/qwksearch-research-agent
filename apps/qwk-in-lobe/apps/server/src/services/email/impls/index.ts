import { CloudflareEmailImpl } from './cloudflare';
import { NodemailerImpl } from './nodemailer';
import { ResendImpl } from './resend';
import { type EmailServiceImpl } from './type';

/**
 * Available email service implementations
 */
export enum EmailImplType {
  /** Cloudflare Email Routing `send_email` binding (Workers) */
  Cloudflare = 'cloudflare',
  Nodemailer = 'nodemailer',
  Resend = 'resend',
  // Future providers can be added here:
  // SendGrid = 'sendgrid',
}

/**
 * Create an email service implementation instance
 */
export const createEmailServiceImpl = (
  type: EmailImplType = EmailImplType.Nodemailer,
): EmailServiceImpl => {
  switch (type) {
    case EmailImplType.Nodemailer: {
      return new NodemailerImpl();
    }
    case EmailImplType.Resend: {
      return new ResendImpl();
    }
    case EmailImplType.Cloudflare: {
      return new CloudflareEmailImpl();
    }

    default: {
      return new NodemailerImpl();
    }
  }
};

export type { EmailServiceImpl } from './type';
export type { EmailPayload, EmailResponse } from './type';
