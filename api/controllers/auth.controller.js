import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';
import { verifyFirebaseIdToken } from '../utils/firebase.js';

export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  try {
    await newUser.save();
    res.status(201).json('User created successfully!');
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found!'));
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));
    const { password: pass, ...rest } = validUser._doc;
    setAuthCookie(res, validUser._id)
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
    const user = await User.findOne({ email });
    if (user) {
      const { password: pass, ...rest } = user._doc;
      setAuthCookie(res, user._id)
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
        password: hashedPassword,
        avatar: photo,
      });
      await newUser.save();
      const { password: pass, ...rest } = newUser._doc;
      setAuthCookie(res, newUser._id)
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
