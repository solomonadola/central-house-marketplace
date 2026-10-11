import Viewing from '../models/viewing.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { addMessage, getOrCreateConversation } from '../utils/conversations.js';

// e.g. "Sat, Oct 18 at 10:00 AM" in the requester's time zone.
export const formatViewingTime = (date, timeZone = 'UTC') => {
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  return `${day} at ${time}`;
};

const withNote = (text, note) => (note ? `${text}\n\n"${note}"` : text);

// Posts a viewing update into the conversation about the listing, so it
// shows up in both people's inboxes.
const postUpdate = async (viewing, senderId, text) => {
  const listing = await Listing.findById(viewing.listing, 'userRef');
  if (!listing) return;
  const conversation = await getOrCreateConversation(listing, viewing.requester);
  await addMessage(conversation, senderId, text);
};

const populateViewing = (query) =>
  query
    .populate('listing', 'name imageUrls address')
    .populate('requester', 'username avatar')
    .populate('owner', 'username avatar');

export const createViewing = async (req, res, next) => {
  try {
    const { listingId, startsAt, timeZone, note } = req.body;
    const listing = await Listing.findById(listingId, 'userRef hidden');
    if (!listing || listing.hidden) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't book a viewing of your own listing!"));
    }

    const active = await Viewing.exists({
      listing: listing._id,
      requester: req.user.id,
      status: { $in: ['pending', 'accepted'] },
      startsAt: { $gt: new Date() },
    });
    if (active) {
      return next(errorHandler(409, 'You already have an upcoming viewing request for this listing.'));
    }

    const viewing = await Viewing.create({
      listing: listing._id,
      requester: req.user.id,
      owner: listing.userRef,
      startsAt,
      timeZone,
      note,
    });
    await postUpdate(
      viewing,
      req.user.id,
      withNote(`Viewing requested for ${formatViewingTime(viewing.startsAt, timeZone)}.`, note)
    );

    res.status(201).json(await populateViewing(Viewing.findById(viewing._id)));
  } catch (error) {
    next(error);
  }
};

// Viewings the user asked for (?as=requester, default) or that were
// requested on their listings (?as=owner), latest first.
export const listViewings = async (req, res, next) => {
  try {
    const field = req.query.as === 'owner' ? 'owner' : 'requester';
    const viewings = await populateViewing(
      Viewing.find({ [field]: req.user.id }).sort({ startsAt: -1, _id: -1 }).limit(100)
    );
    res.status(200).json(viewings);
  } catch (error) {
    next(error);
  }
};

export const updateViewing = async (req, res, next) => {
  try {
    const { action, note } = req.body;
    const viewing = await Viewing.findById(req.params.id);
    const isOwner = viewing?.owner.toString() === req.user.id;
    const isRequester = viewing?.requester.toString() === req.user.id;
    if (!viewing || (!isOwner && !isRequester)) return next(errorHandler(404, 'Viewing not found!'));

    const when = formatViewingTime(viewing.startsAt, viewing.timeZone);
    let text;

    if (action === 'accept' || action === 'decline') {
      if (!isOwner) return next(errorHandler(403, 'Only the listing owner can respond to a viewing request.'));
      if (viewing.status !== 'pending') return next(errorHandler(409, `This viewing is already ${viewing.status}.`));
      if (action === 'accept' && viewing.startsAt <= new Date()) {
        return next(errorHandler(409, 'This viewing time has already passed.'));
      }
      viewing.status = action === 'accept' ? 'accepted' : 'declined';
      text = `Viewing on ${when} ${viewing.status}.`;
    } else {
      if (!['pending', 'accepted'].includes(viewing.status)) {
        return next(errorHandler(409, `This viewing is already ${viewing.status}.`));
      }
      viewing.status = 'cancelled';
      const user = await User.findById(req.user.id, 'username');
      text = `Viewing on ${when} cancelled by ${user?.username ?? 'the other person'}.`;
    }

    viewing.responseNote = note;
    await viewing.save();
    await postUpdate(viewing, req.user.id, withNote(text, note));

    res.status(200).json(await populateViewing(Viewing.findById(viewing._id)));
  } catch (error) {
    next(error);
  }
};
