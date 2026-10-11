import User from '../models/user.model.js';
import { errorHandler } from './error.js';

// True if either user has blocked the other. Blocking works both ways: a
// blocked person can't reach the blocker, and the blocker can't reach them
// without unblocking first.
export const isBlockedBetween = async (userA, userB) => {
  if (!userA || !userB) return false;
  const a = String(userA);
  const b = String(userB);
  const blocked = await User.exists({
    $or: [
      { _id: a, blockedUsers: b },
      { _id: b, blockedUsers: a },
    ],
  });
  return Boolean(blocked);
};

export const blockedError = () => errorHandler(403, "You can't contact this user.", 'BLOCKED');
