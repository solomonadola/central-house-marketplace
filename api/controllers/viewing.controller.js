import Viewing from '../models/viewing.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import AvailabilitySlot from '../models/availabilitySlot.model.js';
import { errorHandler } from '../utils/error.js';
import { addMessage, getOrCreateConversation } from '../utils/conversations.js';
import { blockedError, isBlockedBetween } from '../utils/blocks.js';
import { notifyViewingRequested, notifyViewingResponse } from '../utils/notifications.js';

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
    const listing = await Listing.findById(listingId, 'userRef hidden active name');
    if (!listing || listing.hidden || listing.active === false) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't book a viewing of your own listing!"));
    }
    if (await isBlockedBetween(req.user.id, listing.userRef)) return next(blockedError());

    const active = await Viewing.exists({
      listing: listing._id,
      requester: req.user.id,
      status: { $in: ['pending', 'accepted'] },
      startsAt: { $gt: new Date() },
    });
    if (active) {
      return next(errorHandler(409, 'You already have an upcoming viewing request for this listing.'));
    }

    // Reject requests that would double-book the listing. Viewings are
    // treated as 60-minute blocks unless they carry their own duration.
    const startsAtDate = new Date(startsAt);
    const endsAt = new Date(startsAtDate.getTime() + 60 * 60_000);
    const pending = await Viewing.find(
      { listing: listing._id, status: { $in: ['pending', 'accepted'] } },
      'startsAt durationMinutes'
    );
    const clash = pending.some((v) => {
      const start = v.startsAt.getTime();
      const end = start + (v.durationMinutes ?? 60) * 60_000;
      return startsAtDate.getTime() < end && start < endsAt.getTime();
    });
    if (clash) {
      return next(errorHandler(409, 'That viewing time overlaps another request for this listing.'));
    }

    // If the owner has opened availability, only their slots may be booked.
    let slot = null;
    const hasSlots = await AvailabilitySlot.exists({ listing: listing._id, startsAt: { $gt: new Date() } });
    if (hasSlots) {
      slot = await AvailabilitySlot.findOne({
        listing: listing._id,
        startsAt: startsAtDate,
        endsAt: { $gt: new Date() },
        status: 'open',
      });
      if (!slot) return next(errorHandler(409, 'Please choose one of the available viewing times.'));
    }

    const viewing = await Viewing.create({
      listing: listing._id,
      requester: req.user.id,
      owner: listing.userRef,
      startsAt,
      timeZone,
      note,
    });
    // Reserve the chosen slot so nobody else can take it.
    if (slot) {
      await AvailabilitySlot.updateOne({ _id: slot._id }, { status: 'booked', viewing: viewing._id });
    }
    await postUpdate(
      viewing,
      req.user.id,
      withNote(`Viewing requested for ${formatViewingTime(viewing.startsAt, timeZone)}.`, note)
    );

    const requester = await User.findById(req.user.id, 'username');
    await notifyViewingRequested({
      recipient: listing.userRef,
      requesterName: requester?.username ?? 'Someone',
      listingName: listing.name,
      viewingId: viewing._id,
    });

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

const icsEscape = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/[;,]/g, (c) => `\\${c}`)
    .replace(/\r?\n/g, '\\n');

// YYYYMMDDTHHMMSSZ
const icsDate = (date) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const icsSummary = (viewing) => `Viewing: ${viewing.listing?.name ?? 'Listing'}`;

// Upcoming viewings as an .ics calendar file the user can import. This is
// the same set the viewings page shows.
export const exportViewings = async (req, res, next) => {
  try {
    const field = req.query.as === 'owner' ? 'owner' : 'requester';
    const viewings = await Viewing.find({ [field]: req.user.id, status: { $in: ['pending', 'accepted'] } })
      .sort({ startsAt: 1 })
      .limit(200)
      .populate('listing', 'name address');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Central House Marketplace//Viewings//EN',
      'CALSCALE:GREGORIAN',
    ];

    const stamp = icsDate(new Date());
    for (const viewing of viewings) {
      const end = new Date(viewing.startsAt.getTime() + (viewing.durationMinutes ?? 60) * 60_000);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${viewing._id}@centralhouse`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${icsDate(viewing.startsAt)}`);
      lines.push(`DTEND:${icsDate(end)}`);
      lines.push(`SUMMARY:${icsEscape(icsSummary(viewing))}`);
      if (viewing.listing?.address) lines.push(`LOCATION:${icsEscape(viewing.listing.address)}`);
      if (viewing.note) lines.push(`DESCRIPTION:${icsEscape(viewing.note)}`);
      lines.push(`STATUS:${viewing.status === 'accepted' ? 'CONFIRMED' : 'TENTATIVE'}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="viewings.ics"');
    res.send(lines.join('\r\n'));
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
    // A declined or cancelled viewing frees the slot it was holding.
    if (['declined', 'cancelled'].includes(viewing.status)) {
      await AvailabilitySlot.updateOne({ viewing: viewing._id }, { status: 'open', viewing: null });
    }
    await postUpdate(viewing, req.user.id, withNote(text, note));

    // Tell whoever didn't act: the requester for accept/decline, or the
    // other side when a viewing is cancelled.
    const listing = await Listing.findById(viewing.listing, 'name');
    await notifyViewingResponse({
      recipient: isOwner ? viewing.requester : viewing.owner,
      status: viewing.status,
      listingName: listing?.name,
      viewingId: viewing._id,
    });

    res.status(200).json(await populateViewing(Viewing.findById(viewing._id)));
  } catch (error) {
    next(error);
  }
};
