import crypto from 'crypto';

// Random URL-safe token for emailed links; only its hash is stored, so a
// database leak doesn't expose working links.
export const createToken = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
};

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
