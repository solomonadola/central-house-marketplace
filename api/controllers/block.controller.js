import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';

const MAX_BLOCKED = 500;

export const listBlocked = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+blockedUsers').populate('blockedUsers', 'username avatar');
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json(user.blockedUsers.filter(Boolean));
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return next(errorHandler(400, "You can't block yourself!"));
    const target = await User.findById(req.params.id, 'role');
    if (!target) return next(errorHandler(404, 'User not found!'));
    // Moderators need to be able to reach people about their accounts.
    if (target.role === 'admin') return next(errorHandler(400, "Admins can't be blocked."));

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, [`blockedUsers.${MAX_BLOCKED - 1}`]: { $exists: false } },
      { $addToSet: { blockedUsers: target._id } },
      { new: true }
    ).select('+blockedUsers');
    if (!user) return next(errorHandler(400, `You can block at most ${MAX_BLOCKED} people.`));
    res.status(200).json({ blocked: true, count: user.blockedUsers.length });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { blockedUsers: req.params.id } },
      { new: true }
    ).select('+blockedUsers');
    if (!user) return next(errorHandler(404, 'User not found!'));
    res.status(200).json({ blocked: false, count: user.blockedUsers.length });
  } catch (error) {
    next(error);
  }
};

// Whether the signed-in user has blocked a given user, for UI buttons.
export const getBlockStatus = async (req, res, next) => {
  try {
    const blocked = await User.exists({ _id: req.user.id, blockedUsers: req.params.id });
    res.status(200).json({ blocked: Boolean(blocked) });
  } catch (error) {
    next(error);
  }
};
