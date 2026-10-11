import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar:{
      type: String,
      default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Suspended users can't sign in and their sessions stop working.
    suspended: { type: Boolean, default: false },
    suspendedReason: { type: String, select: false },
    // Bumped to invalidate every existing session (e.g. after a password
    // reset); tokens carry the version they were issued with.
    tokenVersion: { type: Number, default: 0, select: false },
    emailVerified: { type: Boolean, default: false },
    // Hashes of one-time tokens; select: false keeps them out of every
    // response that spreads the user document.
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    favorites: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
      default: [],
    },
    // Whether important events are also emailed, not just shown in the
    // in-app notification inbox. Users can turn this off in their profile.
    emailNotifications: { type: Boolean, default: true },
    // Product news and tips. Off by default.
    marketingEmails: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
