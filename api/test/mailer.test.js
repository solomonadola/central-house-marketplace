import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { appUrl, resetMailTransport, sendMail } from '../utils/mailer.js';
import { passwordResetEmail, verifyEmailEmail } from '../utils/emails.js';

describe('sendMail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetMailTransport();
  });

  it('prints the email when SMTP is not configured', async () => {
    vi.stubEnv('SMTP_URL', '');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendMail({ to: 'a@example.com', subject: 'Hello', text: 'Link: http://x' });

    expect(log.mock.calls[0][0]).toContain('To: a@example.com');
    expect(log.mock.calls[0][0]).toContain('Link: http://x');
  });

  it('sends through SMTP when configured', async () => {
    vi.stubEnv('SMTP_URL', 'smtp://user:pass@localhost:2525');
    vi.stubEnv('MAIL_FROM', 'Team <team@example.com>');
    const send = vi.fn().mockResolvedValue({});
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: send });

    await sendMail({ to: 'a@example.com', subject: 'Hello', text: 't', html: '<p>t</p>' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith('smtp://user:pass@localhost:2525');
    expect(send).toHaveBeenCalledWith({
      from: 'Team <team@example.com>',
      to: 'a@example.com',
      subject: 'Hello',
      text: 't',
      html: '<p>t</p>',
    });
  });

  it('builds app links from APP_URL without a trailing slash', () => {
    vi.stubEnv('APP_URL', 'https://homes.example.com/');
    expect(appUrl()).toBe('https://homes.example.com');
  });
});

describe('email content', () => {
  it('includes the link in both text and HTML', () => {
    const email = passwordResetEmail({ username: 'sarah', url: 'https://x/reset-password/abc' });
    expect(email.subject).toBe('Reset your password');
    expect(email.text).toContain('https://x/reset-password/abc');
    expect(email.html).toContain('href="https://x/reset-password/abc"');
  });

  it('escapes user-controlled text in HTML', () => {
    const email = verifyEmailEmail({ username: '<script>alert(1)</script>', url: 'https://x/verify' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});
