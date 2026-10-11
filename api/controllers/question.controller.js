import ListingQuestion from '../models/listingQuestion.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { notifyQuestionAnswered, notifyQuestionAsked } from '../utils/notifications.js';
import { blockedError, isBlockedBetween } from '../utils/blocks.js';

const MAX_OPEN_QUESTIONS_PER_LISTING = 3;

// Listings that are hidden or paused can only be seen by their owner and
// admins, and the same goes for their questions.
const loadVisibleListing = async (id, user) => {
  const listing = await Listing.findById(id, 'name userRef hidden active');
  if (!listing) return null;
  const privileged = user && (user.id === listing.userRef || user.role === 'admin');
  if ((listing.hidden || listing.active === false) && !privileged) return null;
  return listing;
};

const withAsker = (query) => query.populate('asker', 'username avatar');

// Answered questions are public. The owner also sees unanswered ones so they
// can reply, and askers see their own pending questions.
export const listQuestions = async (req, res, next) => {
  try {
    const listing = await loadVisibleListing(req.params.id, req.user);
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const isOwner = req.user?.id === listing.userRef;
    const filter = { listing: listing._id };
    if (!isOwner) {
      filter.$or = [{ 'answer.body': { $exists: true } }, ...(req.user ? [{ asker: req.user.id }] : [])];
    }

    const questions = await withAsker(ListingQuestion.find(filter).sort({ createdAt: -1, _id: -1 }).limit(100));
    res.status(200).json({
      questions,
      viewer: req.user ? { isOwner, canAsk: !isOwner } : null,
    });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req, res, next) => {
  try {
    const listing = await loadVisibleListing(req.params.id, req.user);
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't ask a question about your own listing!"));
    }
    if (await isBlockedBetween(req.user.id, listing.userRef)) return next(blockedError());

    // Keeps one person from flooding a listing with unanswered questions.
    const open = await ListingQuestion.countDocuments({
      listing: listing._id,
      asker: req.user.id,
      'answer.body': { $exists: false },
    });
    if (open >= MAX_OPEN_QUESTIONS_PER_LISTING) {
      return next(
        errorHandler(429, `You already have ${MAX_OPEN_QUESTIONS_PER_LISTING} unanswered questions on this listing.`)
      );
    }

    const question = await ListingQuestion.create({
      listing: listing._id,
      asker: req.user.id,
      question: req.body.question,
    });

    const asker = await User.findById(req.user.id, 'username');
    await notifyQuestionAsked({
      recipient: listing.userRef,
      askerName: asker?.username ?? 'Someone',
      listingId: listing._id,
      listingName: listing.name,
    });

    res.status(201).json(await withAsker(ListingQuestion.findById(question._id)));
  } catch (error) {
    next(error);
  }
};

// Answers a question, or edits the answer. Only the listing's owner can.
export const answerQuestion = async (req, res, next) => {
  try {
    const question = await ListingQuestion.findById(req.params.id);
    if (!question) return next(errorHandler(404, 'Question not found!'));
    const listing = await Listing.findById(question.listing, 'name userRef');
    if (!listing || listing.userRef !== req.user.id) {
      return next(errorHandler(403, 'Only the listing owner can answer questions.'));
    }

    const firstAnswer = !question.answer?.body;
    question.answer = { body: req.body.answer, answeredAt: new Date() };
    await question.save();

    if (firstAnswer) {
      await notifyQuestionAnswered({
        recipient: question.asker,
        listingId: listing._id,
        listingName: listing.name,
      });
    }

    res.status(200).json(await withAsker(ListingQuestion.findById(question._id)));
  } catch (error) {
    next(error);
  }
};

// Askers can withdraw a question until it's answered; owners and admins can
// remove any question on their listing.
export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await ListingQuestion.findById(req.params.id);
    if (!question) return next(errorHandler(404, 'Question not found!'));
    const listing = await Listing.findById(question.listing, 'userRef');

    const isAsker = question.asker.toString() === req.user.id;
    const isOwner = listing?.userRef === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin && !(isAsker && !question.answer?.body)) {
      return next(errorHandler(403, "You can't delete this question."));
    }

    await question.deleteOne();
    res.status(200).json('Question has been deleted!');
  } catch (error) {
    next(error);
  }
};
