import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'access_token';
const TOKEN_TTL_DAYS = 7;

// Secure (HTTPS-only) in production. COOKIE_SECURE=false overrides it for
// production builds served over plain HTTP, e.g. Docker on a local network.
const secure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure,
};

// Pass a user document loaded with '+tokenVersion'; the token records the
// version so bumping it on the user invalidates every older session.
export const setAuthCookie = (res, user) => {
  const token = jwt.sign({ id: user._id, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    expiresIn: `${TOKEN_TTL_DAYS}d`,
  });
  return res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);
