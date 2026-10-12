// Sends due-soon and overdue rent reminders once, for running from cron or a
// scheduled job (e.g. a Render cron job):
//
//   npm run rent-reminders
import 'dotenv/config';
import mongoose from 'mongoose';
import { sendRentReminders } from '../utils/rentReminders.js';

try {
  await mongoose.connect(process.env.DB);
  const { checked, sent } = await sendRentReminders();
  console.log(`Checked ${checked} unpaid rent charge(s), sent ${sent} reminder(s).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
