import Report from '../models/report.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

export const createReport = async (req, res, next) => {
  try {
    const { listingId, reason, details } = req.body;
    const listing = await Listing.findById(listingId, 'userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't report your own listing!"));
    }

    const report = await Report.create({ listing: listing._id, reporter: req.user.id, reason, details });
    res.status(201).json(report);
  } catch (error) {
    // The partial unique index allows one open report per user and listing.
    if (error.code === 11000) {
      return next(errorHandler(409, "You've already reported this listing. Our team will review it."));
    }
    next(error);
  }
};
