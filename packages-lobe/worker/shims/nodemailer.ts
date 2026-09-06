/** `nodemailer` shim: SMTP sockets are unavailable; EMAIL_SERVICE_PROVIDER=cloudflare or resend instead. */
export const createTransport = () => {
  throw new Error(
    '[lobehub-workers] nodemailer is not available on Cloudflare Workers. Set EMAIL_SERVICE_PROVIDER=cloudflare (Email Routing binding) or resend.',
  );
};
export const createTestAccount = createTransport;
export default { createTestAccount, createTransport };
