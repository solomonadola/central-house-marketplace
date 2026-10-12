import QuickReply from '../models/quickReply.model.js';
import { errorHandler } from '../utils/error.js';

export const MAX_QUICK_REPLIES = 30;

export const listQuickReplies = async (req, res, next) => {
  try {
    const replies = await QuickReply.find({ owner: req.user.id }).sort({ title: 1, _id: 1 });
    res.status(200).json(replies);
  } catch (error) {
    next(error);
  }
};

export const createQuickReply = async (req, res, next) => {
  try {
    const count = await QuickReply.countDocuments({ owner: req.user.id });
    if (count >= MAX_QUICK_REPLIES) {
      return next(errorHandler(400, `You can save at most ${MAX_QUICK_REPLIES} quick replies.`));
    }
    const reply = await QuickReply.create({ owner: req.user.id, ...req.body });
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
};

export const updateQuickReply = async (req, res, next) => {
  try {
    const reply = await QuickReply.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!reply) return next(errorHandler(404, 'Quick reply not found!'));
    res.status(200).json(reply);
  } catch (error) {
    next(error);
  }
};

export const deleteQuickReply = async (req, res, next) => {
  try {
    const result = await QuickReply.deleteOne({ _id: req.params.id, owner: req.user.id });
    if (result.deletedCount === 0) return next(errorHandler(404, 'Quick reply not found!'));
    res.status(200).json('Quick reply deleted!');
  } catch (error) {
    next(error);
  }
};
