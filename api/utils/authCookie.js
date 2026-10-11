import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'access_token';
const TOKEN_TTL_DAYS = 7;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: `${TOKEN_TTL_DAYS}d`,
  });
  return res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);
