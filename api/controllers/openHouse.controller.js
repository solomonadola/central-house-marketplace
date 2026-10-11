import OpenHouse from '../models/openHouse.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';
import { notifyOpenHouseCancelled } from '../utils/notifications.js';

const MAX_UPCOMING_PER_LISTING = 10;

const isPublic = (listing) => listing && !listing.hidden && listing.active !== false;

const upcomingFilter = () => ({ cancelled: false, endsAt: { $gt: new Date() } });

// e.g. "Sat, Oct 18, 10:00 AM" in UTC; the client shows local times.
const describeTime = (date) =>
  `${date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`;

// Shapes an open house for the viewer: everyone sees how many people are
// coming; only the owner sees who.
const present = (openHouse, viewerId, { includeListing = false } = {}) => {
  const isOwner = viewerId && openHouse.owner.toString() === viewerId;
  const rsvpCount = openHouse.rsvps.length;
  return {
    _id: openHouse._id,
    listing: includeListing ? openHouse.listing : openHouse.listing._id ?? openHouse.listing,
    startsAt: openHouse.startsAt,
    endsAt: openHouse.endsAt,
    note: openHouse.note,
    capacity: openHouse.capacity,
    rsvpCount,
    isFull: openHouse.capacity > 0 && rsvpCount >= openHouse.capacity,
    viewer: viewerId
      ? { isOwner: Boolean(isOwner), rsvped: openHouse.rsvps.some((r) => (r.user._id ?? r.user).toString() === viewerId) }
      : null,
    ...(isOwner && {
      attendees: openHouse.rsvps.map((r) => ({
        _id: r.user._id ?? r.user,
        username: r.user.username,
        avatar: r.user.avatar,
        rsvpedAt: r.createdAt,
      })),
    }),
  };
};

export const createOpenHouse = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef hidden active');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef !== req.user.id) {
      return next(errorHandler(403, 'Only the listing owner can schedule open houses.'));
    }
    if (!isPublic(listing)) {
      return next(errorHandler(400, "Hidden or paused listings can't have open houses."));
    }

    const upcoming = await OpenHouse.countDocuments({ listing: listing._id, ...upcomingFilter() });
    if (upcoming >= MAX_UPCOMING_PER_LISTING) {
      return next(errorHandler(400, `A listing can have at most ${MAX_UPCOMING_PER_LISTING} upcoming open houses.`));
    }

    const { startsAt, endsAt, note, capacity } = req.body;
    const overlapping = await OpenHouse.exists({
      listing: listing._id,
      cancelled: false,
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt },
    });
    if (overlapping) return next(errorHandler(409, 'This overlaps another open house for this listing.'));

    const openHouse = await OpenHouse.create({
      listing: listing._id,
      owner: req.user.id,
      startsAt,
      endsAt,
      note,
      capacity,
    });
    res.status(201).json(present(openHouse, req.user.id));
  } catch (error) {
    next(error);
  }
};

// Upcoming open houses for one listing.
export const listForListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id, 'userRef hidden active');
    const isOwner = req.user?.id === listing?.userRef;
    if (!listing || (!isPublic(listing) && !isOwner && req.user?.role !== 'admin')) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    const openHouses = await OpenHouse.find({ listing: listing._id, ...upcomingFilter() })
      .sort({ startsAt: 1 })
      .populate(isOwner ? { path: 'rsvps.user', select: 'username avatar' } : []);
    res.status(200).json(openHouses.map((o) => present(o, req.user?.id)));
  } catch (error) {
    next(error);
  }
};

// Upcoming open houses across the site, soonest first, for public listings.
export const listUpcoming = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const openHouses = await OpenHouse.find(upcomingFilter())
      .sort({ startsAt: 1 })
      .limit(limit * 2)
      .populate('listing', 'name address imageUrls type regularPrice discountPrice offer hidden active');
    const visible = openHouses.filter((o) => isPublic(o.listing)).slice(0, limit);
    res.status(200).json(visible.map((o) => present(o, req.user?.id, { includeListing: true })));
  } catch (error) {
    next(error);
  }
};

// The signed-in user's upcoming RSVPs.
export const listMine = async (req, res, next) => {
  try {
    const openHouses = await OpenHouse.find({ 'rsvps.user': req.user.id, ...upcomingFilter() })
      .sort({ startsAt: 1 })
      .populate('listing', 'name address imageUrls type regularPrice discountPrice offer hidden active');
    res.status(200).json(openHouses.map((o) => present(o, req.user.id, { includeListing: true })));
  } catch (error) {
    next(error);
  }
};

export const rsvp = async (req, res, next) => {
  try {
    const openHouse = await OpenHouse.findById(req.params.id);
    if (!openHouse || openHouse.cancelled || openHouse.endsAt <= new Date()) {
      return next(errorHandler(404, 'Open house not found!'));
    }
    const listing = await Listing.findById(openHouse.listing, 'hidden active');
    if (!isPublic(listing)) return next(errorHandler(404, 'Open house not found!'));
    if (openHouse.owner.toString() === req.user.id) {
      return next(errorHandler(400, "You can't RSVP to your own open house."));
    }

    // Atomic so two last-minute RSVPs can't both take the final spot.
    const capacityCheck = openHouse.capacity > 0 ? { [`rsvps.${openHouse.capacity - 1}`]: { $exists: false } } : {};
    const updated = await OpenHouse.findOneAndUpdate(
      { _id: openHouse._id, 'rsvps.user': { $ne: req.user.id }, ...capacityCheck },
      { $push: { rsvps: { user: req.user.id } } },
      { new: true }
    );
    if (!updated) {
      const already = openHouse.rsvps.some((r) => r.user.toString() === req.user.id);
      if (already) return res.status(200).json(present(openHouse, req.user.id));
      return next(errorHandler(409, 'This open house is full.'));
    }
    res.status(200).json(present(updated, req.user.id));
  } catch (error) {
    next(error);
  }
};

export const cancelRsvp = async (req, res, next) => {
  try {
    const updated = await OpenHouse.findByIdAndUpdate(
      req.params.id,
      { $pull: { rsvps: { user: req.user.id } } },
      { new: true }
    );
    if (!updated) return next(errorHandler(404, 'Open house not found!'));
    res.status(200).json(present(updated, req.user.id));
  } catch (error) {
    next(error);
  }
};

// The owner cancels an open house; everyone who RSVPed is told.
export const cancelOpenHouse = async (req, res, next) => {
  try {
    const openHouse = await OpenHouse.findById(req.params.id);
    if (!openHouse) return next(errorHandler(404, 'Open house not found!'));
    if (openHouse.owner.toString() !== req.user.id) {
      return next(errorHandler(403, 'Only the listing owner can cancel this open house.'));
    }
    if (openHouse.cancelled) return next(errorHandler(409, 'This open house is already cancelled.'));

    openHouse.cancelled = true;
    await openHouse.save();

    const listing = await Listing.findById(openHouse.listing, 'name');
    if (openHouse.rsvps.length > 0 && openHouse.startsAt > new Date()) {
      await notifyOpenHouseCancelled({
        recipients: openHouse.rsvps.map((r) => r.user),
        listingId: openHouse.listing,
        listingName: listing?.name ?? 'a listing',
        when: describeTime(openHouse.startsAt),
      });
    }
    res.status(200).json(present(openHouse, req.user.id));
  } catch (error) {
    next(error);
  }
};
