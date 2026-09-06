// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const cfEnv: { current?: { EMAIL?: { send: ReturnType<typeof vi.fn> } } } = {};

vi.mock('@/envs/email', () => ({ emailEnv: { RESEND_FROM: undefined, SMTP_FROM: 'noreply@qwksearch.com' } }));
vi.mock('@/libs/cloudflare/env', () => ({ getCfEnv: () => cfEnv.current }));

const { CloudflareEmailImpl } = await import('./index');

describe('CloudflareEmailImpl', () => {
  afterEach(() => {
    cfEnv.current = undefined;
  });

  it('fails clearly when the EMAIL binding is missing', async () => {
    await expect(new CloudflareEmailImpl().sendMail({ subject: 's', text: 't', to: 'a@b.c' })).rejects.toThrow(
      /EMAIL binding/,
    );
  });

  it('sends through the binding with the configured sender', async () => {
    const send = vi.fn(async () => ({ id: 'msg_1' }));
    cfEnv.current = { EMAIL: { send } };

    const result = await new CloudflareEmailImpl().sendMail({
      html: '<p>hi</p>',
      replyTo: 'support@qwksearch.com',
      subject: 'Hello',
      to: 'user@example.com',
    });

    expect(result).toEqual({ messageId: 'msg_1' });
    expect(send).toHaveBeenCalledWith({
      from: 'noreply@qwksearch.com',
      html: '<p>hi</p>',
      replyTo: 'support@qwksearch.com',
      subject: 'Hello',
      text: undefined,
      to: 'user@example.com',
    });
  });

  it('requires a body', async () => {
    cfEnv.current = { EMAIL: { send: vi.fn() } };
    await expect(new CloudflareEmailImpl().sendMail({ subject: 's', to: 'a@b.c' })).rejects.toThrow(/html or text/);
  });
});
