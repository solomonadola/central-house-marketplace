import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';
import { verifyFirebaseIdToken } from '../utils/firebase.js';
import { suspendedError } from '../utils/verifyUser.js';
import { createToken, hashToken } from '../utils/tokens.js';
import { appUrl, sendMail } from '../utils/mailer.js';
import { passwordResetEmail } from '../utils/emails.js';
import { checkCode, issueChallenge, readChallenge } from '../utils/twoFactor.js';
import { sendVerificationEmail } from '../utils/emailVerification.js';

export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  try {
    await newUser.save();
    await sendVerificationEmail(newUser);
    res.status(201).json('User created successfully!');
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email }).select('+tokenVersion');
    if (!validUser) return next(errorHandler(404, 'User not found!'));
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));
    if (validUser.suspended) return next(suspendedError());
    // With two-step sign-in on, the password alone doesn't create a
    // session: the user gets an emailed code and a challenge token instead.
    if (validUser.twoFactorEnabled) {
      const { challengeToken } = await issueChallenge(validUser);
      return res.status(200).json({ twoFactorRequired: true, challengeToken, email: maskEmail(validUser.email) });
    }
    const { password: pass, ...rest } = validUser._doc;
    setAuthCookie(res, validUser)
      .status(200)
      .json(rest);
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  const { idToken } = req.body;
  if (typeof idToken !== 'string' || !idToken) {
    return next(errorHandler(400, 'Missing Google ID token!'));
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return next(errorHandler(401, 'Invalid Google ID token!'));
  }
  if (!decoded.email || !decoded.email_verified) {
    return next(errorHandler(401, 'Google account email is not verified!'));
  }

  // Identity comes only from the verified token, never from the request body.
  const email = decoded.email;
  const name = decoded.name || email.split('@')[0];
  const photo = decoded.picture;

  try {
    let user = await User.findOne({ email }).select('+tokenVersion');
    if (user) {
      // Google has verified this address.
      if (!user.emailVerified) {
        user = await User.findByIdAndUpdate(user._id, { emailVerified: true }, { new: true }).select(
          '+tokenVersion'
        );
      }
      if (user.suspended) return next(suspendedError());
      const { password: pass, ...rest } = user._doc;
      setAuthCookie(res, user)
        .status(200)
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        username:
          name.split(' ').join('').toLowerCase() +
          Math.random().toString(36).slice(-4),
        email,
        emailVerified: true,
        password: hashedPassword,
        avatar: photo,
      });
      await newUser.save();
      const { password: pass, ...rest } = newUser._doc;
      setAuthCookie(res, newUser)
        .status(200)
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};

export const signOut = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.status(200).json('User has been logged out!');
  } catch (error) {
    next(error);
  }
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Always responds the same way so it can't be used to find out which
// emails have accounts.
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const { token, hash } = createToken();
      await User.updateOne(
        { _id: user._id },
        { passwordResetTokenHash: hash, passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) }
      );
      const url = `${appUrl()}/reset-password/${token}`;
      try {
        await sendMail({ to: user.email, ...passwordResetEmail({ username: user.username, url }) });
      } catch (error) {
        console.error('Could not send password reset email:', error.message);
      }
    }
    res.status(200).json({ message: 'If an account exists for that email, we sent a link to reset the password.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOneAndUpdate(
      { passwordResetTokenHash: hashToken(token), passwordResetExpires: { $gt: new Date() } },
      {
        password: bcryptjs.hashSync(password, 10),
        // Sign out every existing session: whoever asked for the reset may
        // be locking out someone who had access to the account.
        $inc: { tokenVersion: 1 },
        // Single use: clear the token once it's been used.
        $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      }
    );
    if (!user) {
      return next(errorHandler(400, 'This reset link is invalid or has expired. Please request a new one.'));
    }
    res.status(200).json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { emailVerifyTokenHash: hashToken(req.body.token), emailVerifyExpires: { $gt: new Date() } },
      { emailVerified: true, $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 } },
      { new: true }
    );
    if (!user) {
      return next(errorHandler(400, 'This confirmation link is invalid or has expired.'));
    }
    const { password: pass, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(errorHandler(404, 'User not found!'));
    if (user.emailVerified) return next(errorHandler(400, 'Your email is already confirmed.'));

    await sendVerificationEmail(user);
    res.status(200).json({ message: `We sent a new confirmation link to ${user.email}.` });
  } catch (error) {
    next(error);
  }
};

// "s****@example.com", so the code screen can say where the code went
// without revealing the whole address.
export const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(name.length - 1, 4)))}@${domain}`;
};

const TWO_FACTOR_ERRORS = {
  expired: [400, 'This code has expired. Request a new one.'],
  locked: [429, 'Too many wrong codes. Request a new one.'],
  wrong: [401, "That code isn't right. Check the email and try again."],
};

// Second step of sign-in: checks the emailed code and starts the session.
export const verifyTwoFactor = async (req, res, next) => {
  try {
    const userId = readChallenge(req.body.challengeToken);
    if (!userId) return next(errorHandler(401, 'Your sign-in session expired. Please sign in again.'));

    const result = await checkCode(userId, req.body.code);
    if (result !== 'ok') return next(errorHandler(...TWO_FACTOR_ERRORS[result]));

    const user = await User.findById(userId).select('+tokenVersion');
    if (!user) return next(errorHandler(401, 'Your sign-in session expired. Please sign in again.'));
    if (user.suspended) return next(suspendedError());

    const { password: pass, tokenVersion, ...rest } = user._doc;
    setAuthCookie(res, user).status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const resendTwoFactor = async (req, res, next) => {
  try {
    const userId = readChallenge(req.body.challengeToken);
    const user = userId && (await User.findById(userId));
    if (!user || !user.twoFactorEnabled) {
      return next(errorHandler(401, 'Your sign-in session expired. Please sign in again.'));
    }
    const { challengeToken } = await issueChallenge(user);
    res.status(200).json({ challengeToken, email: maskEmail(user.email) });
  } catch (error) {
    next(error);
  }
};
