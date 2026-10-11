// Email content. Each returns { subject, text, html } for sendMail.

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (paragraphs, button) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #334155">
    <h2 style="color: #334155">Central House Marketplace</h2>
    ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
    <p><a href="${escapeHtml(button.url)}" style="display: inline-block; background: #334155; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none">${escapeHtml(button.label)}</a></p>
    <p style="font-size: 12px; color: #64748b">Or copy this link into your browser: ${escapeHtml(button.url)}</p>
  </div>`;

export const passwordResetEmail = ({ username, url }) => {
  const lines = [
    `Hi ${username},`,
    'Someone asked to reset the password for your Central House Marketplace account. If it was you, use the link below to choose a new password. It expires in 1 hour.',
    "If you didn't ask for this, you can ignore this email; your password won't change.",
  ];
  return {
    subject: 'Reset your password',
    text: `${lines.join('\n\n')}\n\nReset your password: ${url}`,
    html: layout(lines, { url, label: 'Reset password' }),
  };
};

export const verifyEmailEmail = ({ username, url }) => {
  const lines = [
    `Hi ${username},`,
    'Please confirm your email address to finish setting up your Central House Marketplace account. The link expires in 24 hours.',
  ];
  return {
    subject: 'Confirm your email address',
    text: `${lines.join('\n\n')}\n\nConfirm your email: ${url}`,
    html: layout(lines, { url, label: 'Confirm email' }),
  };
};
