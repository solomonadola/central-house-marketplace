import User from '../models/user.model.js';
import { createToken } from './tokens.js';
import { appUrl, sendMail } from './mailer.js';
import { verifyEmailEmail } from './emails.js';

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Creates a fresh verification token for the user and emails the link.
// Sending failures are logged, not thrown: the account change that
// triggered this has already succeeded and the user can resend.
export const sendVerificationEmail = async (user) => {
  const { token, hash } = createToken();
  await User.updateOne(
    { _id: user._id },
    { emailVerifyTokenHash: hash, emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) }
  );
  try {
    const url = `${appUrl()}/verify-email/${token}`;
    await sendMail({ to: user.email, ...verifyEmailEmail({ username: user.username, url }) });
  } catch (error) {
    console.error('Could not send verification email:', error.message);
  }
};
