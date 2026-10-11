// Must be the first import so .env is loaded before other modules read it.
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import listingRouter from './routes/listing.route.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
const missing = ['DB', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
  );
  process.exit(1);
}

const __dirname = path.resolve();

const app = express();

// Behind a reverse proxy (Render, Nginx, ...) set TRUST_PROXY=1 so rate
// limiting sees the real client IP instead of the proxy's.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.use(
  helmet({
    // TODO: enable a CSP once the Firebase, Google sign-in and image
    // origins it must allow have been tested in a browser.
    contentSecurityPolicy: false,
    // Google sign-in uses a popup that must be able to message this window.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

app.use(express.json());

app.use(cookieParser());


app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/listing', listingRouter);


app.use(express.static(path.join(__dirname, '/client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
})

app.use((err, req, res, next) => {
  // Duplicate key from a unique index, e.g. a taken username or email.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Value';
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken!`,
    });
  }
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

const PORT = process.env.PORT || 3000;

// Only accept requests once the database is reachable; a bad DB setting
// should stop the server loudly rather than leave every request hanging.
mongoose
  .connect(process.env.DB, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('Connected to MongoDB!');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}!`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
