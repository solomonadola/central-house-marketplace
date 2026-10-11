// Grants or removes admin rights from the command line. There's no API for
// this, so nobody can promote themselves through the app.
//
//   npm run make-admin -- someone@example.com
//   npm run make-admin -- someone@example.com --remove
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

const [email, flag] = process.argv.slice(2);
if (!email || (flag && flag !== '--remove')) {
  console.error('Usage: npm run make-admin -- <email> [--remove]');
  process.exit(1);
}
const role = flag === '--remove' ? 'user' : 'admin';

try {
  await mongoose.connect(process.env.DB);
  const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`${user.username} (${user.email}) is now ${role === 'admin' ? 'an admin' : 'a regular user'}.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
