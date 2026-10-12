import ContentFlag from '../models/contentFlag.model.js';
import Review from '../models/review.model.js';
import ListingQuestion from '../models/listingQuestion.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';
import { recordAudit } from '../utils/auditLog.js';
import { updateListingRating } from '../utils/ratings.js';
import { notifyAdmins, notifyContentRemoved } from '../utils/notifications.js';

// Where each kind of content lives, who wrote it and what it says.
const TARGETS = {
  review: { Model: Review, authorField: 'author', text: (r) => r.comment || `${r.rating}-star rating` },
  question: { Model: ListingQuestion, authorField: 'asker', text: (q) => q.question },
};

const excerpt = (text, length = 80) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

// Admins hear about content once, when its first open flag comes in, rather
// than on every flag.
const FLAGS_BEFORE_ALERT = 1;

export const flagContent = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const { Model, authorField } = TARGETS[targetType];
    const target = await Model.findById(targetId);
    if (!target || target.removed) return next(errorHandler(404, `That ${targetType} no longer exists.`));
    if (target[authorField].toString() === req.user.id) {
      return next(errorHandler(400, `You can't flag your own ${targetType}.`));
    }

    await ContentFlag.create({ targetType, target: target._id, listing: target.listing, reporter: req.user.id, reason, details });

    const open = await ContentFlag.countDocuments({ targetType, target: target._id, status: 'open' });
    if (open === FLAGS_BEFORE_ALERT) {
      await notifyAdmins({
        type: 'report_received',
        title: `A ${targetType} was flagged`,
        body: excerpt(TARGETS[targetType].text(target)),
        link: '/admin?tab=content',
        meta: { targetType, targetId: target._id },
      });
    }
    res.status(201).json({ flagged: true });
  } catch (error) {
    if (error.code === 11000) return next(errorHandler(409, `You already flagged this ${req.body.targetType}.`));
    next(error);
  }
};

// Open flags grouped by the content they're about, most-flagged first, with
// the content itself so admins can judge it without leaving the page.
export const listFlaggedContent = async (req, res, next) => {
  try {
    const groups = await ContentFlag.aggregate([
      { $match: { status: 'open' } },
      {
        $group: {
          _id: { targetType: '$targetType', target: '$target' },
          listing: { $first: '$listing' },
          count: { $sum: 1 },
          reasons: { $push: '$reason' },
          details: { $push: '$details' },
          lastFlaggedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1, lastFlaggedAt: -1 } },
      { $limit: 100 },
    ]);

    const idsOf = (type) => groups.filter((g) => g._id.targetType === type).map((g) => g._id.target);
    const [reviews, questions, listings] = await Promise.all([
      Review.find({ _id: { $in: idsOf('review') } }, 'comment rating author createdAt').populate('author', 'username'),
      ListingQuestion.find({ _id: { $in: idsOf('question') } }, 'question answer asker createdAt').populate('asker', 'username'),
      Listing.find({ _id: { $in: groups.map((g) => g.listing) } }, 'name'),
    ]);
    const byId = new Map([...reviews, ...questions, ...listings].map((doc) => [doc._id.toString(), doc]));

    const items = groups
      .map((g) => {
        const content = byId.get(g._id.target.toString());
        if (!content) return null;
        const { authorField, text } = TARGETS[g._id.targetType];
        const reasonCounts = {};
        g.reasons.forEach((r) => {
          reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
        });
        return {
          targetType: g._id.targetType,
          targetId: g._id.target,
          text: text(content),
          rating: content.rating ?? null,
          author: content[authorField] ? { _id: content[authorField]._id, username: content[authorField].username } : null,
          postedAt: content.createdAt,
          listing: { _id: g.listing, name: byId.get(g.listing.toString())?.name ?? 'Deleted listing' },
          flagCount: g.count,
          reasons: reasonCounts,
          details: g.details.filter(Boolean),
          lastFlaggedAt: g.lastFlaggedAt,
        };
      })
      // Content deleted since it was flagged has nothing left to moderate.
      .filter(Boolean);

    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

// Content admins removed, newest first, so it can be restored if needed.
export const listRemovedContent = async (req, res, next) => {
  try {
    const [reviews, questions] = await Promise.all([
      Review.find({ removed: true }, 'comment rating author listing removedReason removedAt')
        .sort({ removedAt: -1 })
        .limit(50)
        .populate('author', 'username')
        .populate('listing', 'name'),
      ListingQuestion.find({ removed: true }, 'question asker listing removedReason removedAt')
        .sort({ removedAt: -1 })
        .limit(50)
        .populate('asker', 'username')
        .populate('listing', 'name'),
    ]);
    const shape = (targetType) => (doc) => ({
      targetType,
      targetId: doc._id,
      text: TARGETS[targetType].text(doc),
      author: doc[TARGETS[targetType].authorField] ?? null,
      listing: doc.listing,
      removedReason: doc.removedReason,
      removedAt: doc.removedAt,
    });
    const items = [...reviews.map(shape('review')), ...questions.map(shape('question'))].sort(
      (a, b) => new Date(b.removedAt) - new Date(a.removedAt)
    );
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

const loadTarget = async (req, next) => {
  const config = TARGETS[req.params.type];
  if (!config) {
    next(errorHandler(404, 'Unknown content type!'));
    return {};
  }
  const target = await config.Model.findById(req.params.id).populate('listing', 'name');
  if (!target) {
    next(errorHandler(404, 'Content not found!'));
    return {};
  }
  return { target, config };
};

const closeFlags = (targetType, target, status) =>
  ContentFlag.updateMany({ targetType, target, status: 'open' }, { status, handledAt: new Date() });

export const removeContent = async (req, res, next) => {
  try {
    const { target, config } = await loadTarget(req, next);
    if (!target) return;
    if (target.removed) return next(errorHandler(409, 'This content is already removed.'));

    const type = req.params.type;
    Object.assign(target, { removed: true, removedReason: req.body.reason, removedAt: new Date() });
    await target.save();
    await closeFlags(type, target._id, 'actioned');
    if (type === 'review') await updateListingRating(target.listing._id);

    await notifyContentRemoved({
      recipient: target[config.authorField],
      targetType: type,
      listingName: target.listing?.name ?? 'a listing',
      listingId: target.listing?._id,
      reason: req.body.reason,
    });
    await recordAudit({
      actor: req.user.id,
      action: 'remove_content',
      targetType: type,
      targetId: target._id,
      targetLabel: excerpt(config.text(target)),
      reason: req.body.reason,
    });
    res.status(200).json({ removed: true });
  } catch (error) {
    next(error);
  }
};

export const restoreContent = async (req, res, next) => {
  try {
    const { target, config } = await loadTarget(req, next);
    if (!target) return;
    if (!target.removed) return next(errorHandler(409, 'This content is not removed.'));

    Object.assign(target, { removed: false, removedReason: '', removedAt: null });
    await target.save();
    if (req.params.type === 'review') await updateListingRating(target.listing._id);

    await recordAudit({
      actor: req.user.id,
      action: 'restore_content',
      targetType: req.params.type,
      targetId: target._id,
      targetLabel: excerpt(config.text(target)),
    });
    res.status(200).json({ removed: false });
  } catch (error) {
    next(error);
  }
};

// Leaves the content up and closes its flags.
export const dismissFlags = async (req, res, next) => {
  try {
    const { target, config } = await loadTarget(req, next);
    if (!target) return;

    const { modifiedCount } = await closeFlags(req.params.type, target._id, 'dismissed');
    if (modifiedCount === 0) return next(errorHandler(409, 'There are no open flags on this content.'));

    await recordAudit({
      actor: req.user.id,
      action: 'dismiss_flags',
      targetType: req.params.type,
      targetId: target._id,
      targetLabel: excerpt(config.text(target)),
      meta: { flags: modifiedCount },
    });
    res.status(200).json({ dismissed: modifiedCount });
  } catch (error) {
    next(error);
  }
};
