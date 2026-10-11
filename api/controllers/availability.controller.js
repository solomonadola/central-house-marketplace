import AvailabilitySlot from '../models/availabilitySlot.model.js';
import Listing from '../models/listing.model.js';
import Viewing from '../models/viewing.model.js';
import { errorHandler } from '../utils/error.js';

const DEFAULT_DURATION = 60;

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// Upcoming slots for a listing. Everyone sees the open ones; the owner also
// sees which are booked. Guests get a read-only list to pick from.
export const listSlots = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.listingId, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const isOwner = req.user && req.user.id === listing.userRef;
    const filter = { listing: listing._id, startsAt: { $gt: new Date() } };
    if (!isOwner) filter.status = 'open';

    const slots = await AvailabilitySlot.find(filter).sort({ startsAt: 1 }).limit(200);
    res.status(200).json(slots);
  } catch (error) {
    next(error);
  }
};

// Owner-only: add one or more slots at once, rejecting anything that is in
// the past or overlaps an existing slot or viewing request.
export const createSlots = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.listingId, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef !== req.user.id) {
      return next(errorHandler(401, 'You can only manage availability for your own listings!'));
    }

    const [existingSlots, viewings] = await Promise.all([
      AvailabilitySlot.find({ listing: listing._id }),
      Viewing.find(
        { listing: listing._id, status: { $in: ['pending', 'accepted'] }, startsAt: { $gt: new Date() } },
        'startsAt durationMinutes'
      ),
    ]);

    // Ranges already taken, as [start, end] millisecond pairs.
    const taken = existingSlots.map((s) => [s.startsAt.getTime(), s.endsAt.getTime()]);
    const booked = viewings.map((v) => {
      const start = v.startsAt.getTime();
      return [start, start + (v.durationMinutes ?? DEFAULT_DURATION) * 60_000];
    });
    const busy = [...taken, ...booked];

    const now = Date.now();
    const toCreate = [];
    for (const slot of req.body.slots) {
      const start = new Date(slot.startsAt).getTime();
      const end = new Date(slot.endsAt).getTime();
      if (start <= now) return next(errorHandler(400, 'Slots must be in the future.'));
      if (end <= start) return next(errorHandler(400, 'A slot must end after it starts.'));
      if (busy.some(([bStart, bEnd]) => overlaps(start, end, bStart, bEnd))) {
        return next(errorHandler(409, 'That slot overlaps an existing slot or viewing request.'));
      }
      busy.push([start, end]);
      toCreate.push({
        listing: listing._id,
        owner: req.user.id,
        startsAt: new Date(start),
        endsAt: new Date(end),
      });
    }

    const created = await AvailabilitySlot.insertMany(toCreate, { ordered: true });
    res.status(201).json(created);
  } catch (error) {
    // Unique index on (listing, startsAt): two slots starting together.
    if (error.code === 11000) return next(errorHandler(409, 'Two slots cannot start at the same time.'));
    next(error);
  }
};

export const deleteSlot = async (req, res, next) => {
  try {
    const slot = await AvailabilitySlot.findById(req.params.id);
    if (!slot) return next(errorHandler(404, 'Slot not found!'));
    if (slot.owner.toString() !== req.user.id) {
      return next(errorHandler(401, 'You can only remove your own slots!'));
    }
    if (slot.status === 'booked') {
      return next(errorHandler(409, 'This slot is booked. Cancel the viewing first.'));
    }
    await slot.deleteOne();
    res.status(200).json('Slot removed!');
  } catch (error) {
    next(error);
  }
};

// Removes every open slot for a listing in one go.
export const clearSlots = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.listingId, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef !== req.user.id) {
      return next(errorHandler(401, 'You can only manage availability for your own listings!'));
    }
    const { deletedCount } = await AvailabilitySlot.deleteMany({ listing: listing._id, status: 'open' });
    res.status(200).json({ deleted: deletedCount });
  } catch (error) {
    next(error);
  }
};
