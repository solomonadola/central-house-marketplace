import Application from '../models/application.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { sendCsv, toCsv } from '../utils/csv.js';
import { notifyApplicationReceived, notifyApplicationStatus } from '../utils/notifications.js';

const ACTIVE_STATUSES = ['submitted', 'under_review', 'approved'];

const populateApplication = (query) =>
  query
    .populate('listing', 'name imageUrls type regularPrice discountPrice offer address')
    .populate('applicant', 'username avatar emailVerified')
    .populate('owner', 'username avatar');

const isParticipant = (application, userId) =>
  application.applicant.toString() === userId || application.owner.toString() === userId;

export const createApplication = async (req, res, next) => {
  try {
    const { listingId, fullName, email, phone, message, moveInDate, occupants, income } = req.body;
    const listing = await Listing.findById(listingId, 'userRef hidden active name');
    if (!listing || listing.hidden || listing.active === false) return next(errorHandler(404, 'Listing not found!'));
    if (listing.userRef === req.user.id) {
      return next(errorHandler(400, "You can't apply to your own listing!"));
    }

    const existing = await Application.exists({
      listing: listing._id,
      applicant: req.user.id,
      status: { $in: ACTIVE_STATUSES },
    });
    if (existing) {
      return next(errorHandler(409, 'You already have an active application for this listing.'));
    }

    const application = await Application.create({
      listing: listing._id,
      applicant: req.user.id,
      owner: listing.userRef,
      fullName,
      email,
      phone,
      message,
      moveInDate,
      occupants,
      income,
    });

    const applicant = await User.findById(req.user.id, 'username');
    await notifyApplicationReceived({
      recipient: listing.userRef,
      applicantName: applicant?.username ?? 'Someone',
      listingName: listing.name,
      listingId: listing._id,
    });

    res.status(201).json(await populateApplication(Application.findById(application._id)));
  } catch (error) {
    // The partial unique index: a second active application slipped through.
    if (error.code === 11000) {
      return next(errorHandler(409, 'You already have an active application for this listing.'));
    }
    next(error);
  }
};

// Applications the user submitted (?role=applicant, default) or received
// on their own listings (?role=owner), newest first.
export const listApplications = async (req, res, next) => {
  try {
    const field = req.query.role === 'owner' ? 'owner' : 'applicant';
    const applications = await populateApplication(
      Application.find({ [field]: req.user.id }).sort({ createdAt: -1, _id: -1 }).limit(100)
    );
    res.status(200).json(applications);
  } catch (error) {
    next(error);
  }
};

export const getApplication = async (req, res, next) => {
  try {
    const application = await populateApplication(Application.findById(req.params.id));
    if (!application || !isParticipant(application, req.user.id)) {
      return next(errorHandler(404, 'Application not found!'));
    }
    res.status(200).json(application);
  } catch (error) {
    next(error);
  }
};

const OWNER_ACTIONS = { review: 'under_review', approve: 'approved', reject: 'rejected' };

export const updateApplication = async (req, res, next) => {
  try {
    const { action, note } = req.body;
    const application = await Application.findById(req.params.id);
    const isOwner = application?.owner.toString() === req.user.id;
    const isApplicant = application?.applicant.toString() === req.user.id;
    if (!application || (!isOwner && !isApplicant)) {
      return next(errorHandler(404, 'Application not found!'));
    }

    if (action === 'withdraw') {
      if (!isApplicant) return next(errorHandler(403, 'Only the applicant can withdraw an application.'));
      if (!['submitted', 'under_review'].includes(application.status)) {
        return next(errorHandler(409, `This application is already ${application.status}.`));
      }
      application.status = 'withdrawn';
    } else {
      if (!isOwner) return next(errorHandler(403, 'Only the listing owner can review applications.'));
      if (!['submitted', 'under_review'].includes(application.status)) {
        return next(errorHandler(409, `This application is already ${application.status}.`));
      }
      application.status = OWNER_ACTIONS[action];
      if (note) application.responseNote = note;
    }

    application.statusChangedAt = new Date();
    await application.save();

    if (isOwner) {
      const listing = await Listing.findById(application.listing, 'name');
      await notifyApplicationStatus({
        recipient: application.applicant,
        status: application.status,
        listingName: listing?.name,
        listingId: application.listing,
      });
    }

    res.status(200).json(await populateApplication(Application.findById(application._id)));
  } catch (error) {
    next(error);
  }
};

export const deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application || !isParticipant(application, req.user.id)) {
      return next(errorHandler(404, 'Application not found!'));
    }
    if (!['withdrawn', 'rejected'].includes(application.status)) {
      return next(errorHandler(409, 'Only withdrawn or rejected applications can be deleted.'));
    }
    await application.deleteOne();
    res.status(200).json('Application deleted!');
  } catch (error) {
    next(error);
  }
};

const CSV_COLUMNS = [
  { label: 'Listing', value: (a) => a.listing?.name ?? '' },
  { label: 'Applicant', value: (a) => a.applicant?.username ?? '' },
  { label: 'Full name', value: (a) => a.fullName },
  { label: 'Email', value: (a) => a.email },
  { label: 'Phone', value: (a) => a.phone },
  { label: 'Occupants', value: (a) => a.occupants },
  { label: 'Income', value: (a) => a.income ?? '' },
  { label: 'Move-in date', value: (a) => (a.moveInDate ? a.moveInDate.toISOString().slice(0, 10) : '') },
  { label: 'Status', value: (a) => a.status },
  { label: 'Message', value: (a) => a.message },
  { label: 'Submitted', value: (a) => a.createdAt.toISOString() },
];

// A CSV of every application received on the signed-in owner's listings.
export const exportApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('listing', 'name')
      .populate('applicant', 'username');

    const csv = toCsv(CSV_COLUMNS, applications);
    sendCsv(res, `central-house-applications-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  } catch (error) {
    next(error);
  }
};
