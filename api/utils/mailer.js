import nodemailer from 'nodemailer';

// Sends email through SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465,
// which works with Gmail, Resend, SendGrid, Mailgun, ...). Without
// SMTP_URL, emails are printed to the console so links can be used in
// local development without an email provider.
let transport;

const getTransport = () => {
  if (!transport && process.env.SMTP_URL) {
    transport = nodemailer.createTransport(process.env.SMTP_URL);
  }
  return transport;
};

export const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

export const sendMail = async ({ to, subject, text, html }) => {
  const from = process.env.MAIL_FROM || 'Central House Marketplace <no-reply@centralhouse.local>';
  const smtp = getTransport();

  if (!smtp) {
    console.log(`\n--- Email (set SMTP_URL to send for real) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`);
    return;
  }

  await smtp.sendMail({ from, to, subject, text, html });
};

// For tests: forget the cached transport after changing SMTP_URL.
export const resetMailTransport = () => {
  transport = undefined;
};
