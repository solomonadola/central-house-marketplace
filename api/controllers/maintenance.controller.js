import mongoose from 'mongoose';
import MaintenanceRequest from '../models/maintenanceRequest.model.js';
import Application from '../models/application.model.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { notifyMaintenanceRequested, notifyMaintenanceUpdated } from '../utils/notifications.js';

const MAX_OPEN_PER_TENANT = 20;

// Status changes each side may make, from -> allowed targets.
const TRANSITIONS = {
  owner: { open: ['in_progress', 'resolved'], in_progress: ['resolved'], resolved: [], closed: [] },
  tenant: { open: ['closed'], in_progress: [], resolved: ['open', 'closed'], closed: [] },
};

// A user is a tenant of a rental listing once the owner approved their
// application for it.
const approvedRentals = (userId) =>
  Application.find({ applicant: userId, status: 'approved' }).populate('listing', 'name address imageUrls type userRef');

const populate = (query) =>
  query
    .populate('listing', 'name address imageUrls')
    .populate('tenant', 'username avatar')
    .populate('owner', 'username avatar')
    .populate('updates.author', 'username avatar');

const roleOf = (request, userId) => {
  if (request.owner._id?.toString?.() === userId || request.owner.toString() === userId) return 'owner';
  if (request.tenant._id?.toString?.() === userId || request.tenant.toString() === userId) return 'tenant';
  return null;
};

// Rentals the signed-in user can report problems for.
export const listEligibleListings = async (req, res, next) => {
  try {
    const applications = await approvedRentals(req.user.id);
    const listings = applications
      .map((a) => a.listing)
      .filter((l) => l && l.type === 'rent')
      .map((l) => ({ _id: l._id, name: l.name, address: l.address, imageUrl: l.imageUrls?.[0] ?? null }));
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

export const createRequest = async (req, res, next) => {
  try {
    const { listingId, title, description, category, urgency } = req.body;
    const listing = await Listing.findById(listingId, 'name type userRef');
    if (!listing) return next(errorHandler(404, 'Listing not found!'));

    const tenancy = await Application.exists({ listing: listing._id, applicant: req.user.id, status: 'approved' });
    if (!tenancy || listing.type !== 'rent') {
      return next(errorHandler(403, 'You can report problems for homes you rent through an approved application.'));
    }

    const open = await MaintenanceRequest.countDocuments({ tenant: req.user.id, status: { $in: ['open', 'in_progress'] } });
    if (open >= MAX_OPEN_PER_TENANT) {
      return next(errorHandler(429, `You already have ${MAX_OPEN_PER_TENANT} open requests.`));
    }

    const request = await MaintenanceRequest.create({
      listing: listing._id,
      tenant: req.user.id,
      owner: listing.userRef,
      title,
      description,
      category,
      urgency,
    });

    const tenant = await User.findById(req.user.id, 'username');
    await notifyMaintenanceRequested({
      recipient: listing.userRef,
      tenantName: tenant?.username ?? 'Your tenant',
      title,
      urgency,
      requestId: request._id,
    });

    res.status(201).json(await populate(MaintenanceRequest.findById(request._id)));
  } catch (error) {
    next(error);
  }
};

// Requests the user reported (?as=tenant, default) or received as an owner
// (?as=owner), most recently active first. ?status= filters.
export const listRequests = async (req, res, next) => {
  try {
    const field = req.query.as === 'owner' ? 'owner' : 'tenant';
    const filter = { [field]: req.user.id };
    if (['open', 'in_progress', 'resolved', 'closed'].includes(req.query.status)) filter.status = req.query.status;

    const requests = await MaintenanceRequest.find(filter, '-updates')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(100)
      .populate('listing', 'name address imageUrls')
      .populate(field === 'owner' ? 'tenant' : 'owner', 'username avatar');
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const getRequest = async (req, res, next) => {
  try {
    const request = await populate(MaintenanceRequest.findById(req.params.id));
    const role = request && roleOf(request, req.user.id);
    if (!role) return next(errorHandler(404, 'Request not found!'));

    res.status(200).json({
      request,
      viewer: { role, allowedStatuses: TRANSITIONS[role][request.status] },
    });
  } catch (error) {
    next(error);
  }
};

// Adds a comment and/or changes the status, within what the user's role
// allows, and tells the other side.
export const addUpdate = async (req, res, next) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    const role = request && roleOf(request, req.user.id);
    if (!role) return next(errorHandler(404, 'Request not found!'));

    const { body, status } = req.body;
    const statusChange = status && status !== request.status ? status : undefined;
    if (statusChange && !TRANSITIONS[role][request.status].includes(statusChange)) {
      return next(errorHandler(400, `You can't change this request from ${request.status} to ${statusChange}.`));
    }
    if (request.status === 'closed' && !statusChange) {
      return next(errorHandler(409, 'This request is closed.'));
    }
    if (!body && !statusChange) return next(errorHandler(400, 'Write an update or change the status'));

    request.updates.push({ author: req.user.id, body, ...(statusChange && { status: statusChange }) });
    if (statusChange) {
      request.status = statusChange;
      if (statusChange === 'resolved') request.resolvedAt = new Date();
      if (statusChange === 'open') request.resolvedAt = null;
    }
    await request.save();

    const author = await User.findById(req.user.id, 'username');
    await notifyMaintenanceUpdated({
      recipient: role === 'owner' ? request.tenant : request.owner,
      authorName: author?.username ?? 'Someone',
      title: request.title,
      status: statusChange,
      requestId: request._id,
    });

    const updated = await populate(MaintenanceRequest.findById(request._id));
    res.status(200).json({ request: updated, viewer: { role, allowedStatuses: TRANSITIONS[role][updated.status] } });
  } catch (error) {
    next(error);
  }
};

// Counts for the owner's dashboard: how many requests are waiting.
export const getSummary = async (req, res, next) => {
  try {
    const rows = await MaintenanceRequest.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const summary = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    rows.forEach((r) => {
      summary[r._id] = r.count;
    });
    const urgent = await MaintenanceRequest.countDocuments({ owner: req.user.id, urgency: 'urgent', status: { $in: ['open', 'in_progress'] } });
    res.status(200).json({ ...summary, urgentOpen: urgent });
  } catch (error) {
    next(error);
  }
};
