import express from 'express';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import listingRouter from './routes/listing.route.js';
import messageRouter from './routes/message.route.js';
import reviewRouter from './routes/review.route.js';
import reportRouter from './routes/report.route.js';
import adminRouter from './routes/admin.route.js';
import viewingRouter from './routes/viewing.route.js';
import notificationRouter from './routes/notification.route.js';
import savedSearchRouter from './routes/savedSearch.route.js';
import availabilityRouter from './routes/availability.route.js';
import applicationRouter from './routes/application.route.js';
import paymentRouter from './routes/payment.route.js';
import insightsRouter from './routes/insights.route.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { errorHandler } from './utils/error.js';
import questionRouter from './routes/question.route.js';
import openHouseRouter from './routes/openHouse.route.js';
import maintenanceRouter from './routes/maintenance.route.js';
import quickReplyRouter from './routes/quickReply.route.js';
import listingDraftRouter from './routes/listingDraft.route.js';
import leaseRouter from './routes/lease.route.js';
import inspectionRouter from './routes/inspection.route.js';
import contentFlagRouter from './routes/contentFlag.route.js';

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
app.use('/api/messages', messageRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/reports', reportRouter);
app.use('/api/admin', adminRouter);
app.use('/api/viewings', viewingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/saved-searches', savedSearchRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/questions', questionRouter);
app.use('/api/open-houses', openHouseRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/quick-replies', quickReplyRouter);
app.use('/api/listing-drafts', listingDraftRouter);
app.use('/api/leases', leaseRouter);
app.use('/api/inspections', inspectionRouter);
app.use('/api/content-flags', contentFlagRouter);

// Liveness probe for Docker/monitoring.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// Unknown API routes get a JSON 404 instead of falling through to the
// client's index.html below.
app.use('/api', (req, res, next) => {
  next(errorHandler(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

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
    // Only our own string codes; Mongo and other libraries use numeric ones.
    ...(typeof err.code === 'string' && { code: err.code }),
  });
});

export default app;
