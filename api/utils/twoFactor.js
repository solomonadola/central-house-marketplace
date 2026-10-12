import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { hashToken } from './tokens.js';
import { sendMail } from './mailer.js';
import { twoFactorCodeEmail } from './emails.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
const CHALLENGE_PURPOSE = 'two-factor';

// A fresh 6-digit code, zero-padded, from a cryptographic source.
export const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

// Compares two hex hashes without leaking timing information.
const sameHash = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};

// Starts (or restarts) a two-step sign-in: stores a hash of a new code,
// emails the code, and returns a short-lived token naming the user. The
// token proves the password step passed; it is not a session.
export const issueChallenge = async (user) => {
  const code = generateCode();
  await User.updateOne(
    { _id: user._id },
    {
      twoFactorCodeHash: hashToken(code),
      twoFactorExpires: new Date(Date.now() + CODE_TTL_MS),
      twoFactorAttempts: 0,
    }
  );
  try {
    await sendMail({ to: user.email, ...twoFactorCodeEmail({ username: user.username, code }) });
  } catch (error) {
    console.error('Could not send sign-in code:', error.message);
  }
  const challengeToken = jwt.sign(
    { id: user._id.toString(), purpose: CHALLENGE_PURPOSE },
    process.env.JWT_SECRET,
    { expiresIn: Math.floor(CODE_TTL_MS / 1000) }
  );
  return { challengeToken, code };
};

// The user id in a valid challenge token, or null.
export const readChallenge = (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.purpose === CHALLENGE_PURPOSE ? payload.id : null;
  } catch {
    return null;
  }
};

// Checks a code for a user. Returns 'ok', 'expired', 'locked' or 'wrong'.
// Wrong codes count towards the attempt limit; a correct code clears the
// stored hash so it can't be reused.
export const checkCode = async (userId, code) => {
  const user = await User.findById(userId).select('+twoFactorCodeHash +twoFactorExpires +twoFactorAttempts');
  if (!user?.twoFactorCodeHash || !user.twoFactorExpires || user.twoFactorExpires <= new Date()) return 'expired';
  if (user.twoFactorAttempts >= MAX_ATTEMPTS) return 'locked';

  if (!sameHash(hashToken(code), user.twoFactorCodeHash)) {
    await User.updateOne({ _id: user._id }, { $inc: { twoFactorAttempts: 1 } });
    return user.twoFactorAttempts + 1 >= MAX_ATTEMPTS ? 'locked' : 'wrong';
  }

  await User.updateOne(
    { _id: user._id },
    { $unset: { twoFactorCodeHash: 1, twoFactorExpires: 1 }, twoFactorAttempts: 0 }
  );
  return 'ok';
};
