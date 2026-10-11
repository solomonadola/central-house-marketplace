// Must be the first import so .env is loaded before other modules read it.
import 'dotenv/config';
import mongoose from 'mongoose';

const missing = ['DB', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
  );
  process.exit(1);
}

// Imported after the env check so modules that read config at load time
// never see a half-configured environment.
const { default: app } = await import('./app.js');

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
