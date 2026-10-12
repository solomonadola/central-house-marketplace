import Inspection from '../models/inspection.model.js';
import Lease from '../models/lease.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import { compareInspections, defaultRooms } from '../utils/inspections.js';
import { notifyInspectionAnswered, notifyInspectionSubmitted } from '../utils/notifications.js';

const KIND_NAMES = { move_in: 'move-in', move_out: 'move-out' };

const populate = (query) =>
  query
    .populate('listing', 'name address')
    .populate('owner', 'username avatar')
    .populate('tenant', 'username avatar');

const idOf = (ref) => (ref?._id ?? ref).toString();

const roleOf = (doc, userId) => {
  if (idOf(doc.owner) === userId) return 'owner';
  if (idOf(doc.tenant) === userId) return 'tenant';
  return null;
};

// Tenants only see a report once the owner has sent it to them.
const visibleTo = (inspection, role) => role === 'owner' || (role === 'tenant' && inspection.status !== 'draft');

const loadInspection = async (req, next, requiredRole) => {
  const inspection = await populate(Inspection.findById(req.params.id));
  const role = inspection && roleOf(inspection, req.user.id);
  if (!role || !visibleTo(inspection, role) || (requiredRole && role !== requiredRole)) {
    next(errorHandler(404, 'Inspection not found!'));
    return {};
  }
  return { inspection, role };
};

// The report plus, for a move-out report, how each item compares with the
// move-in report of the same lease.
const view = async (inspection, role) => {
  let comparison = null;
  if (inspection.kind === 'move_out') {
    const moveIn = await Inspection.findOne({ lease: inspection.lease, kind: 'move_in' });
    if (moveIn && visibleTo(moveIn, role)) comparison = compareInspections(moveIn, inspection);
  }
  return { inspection, comparison, viewer: { role } };
};

export const createInspection = async (req, res, next) => {
  try {
    const lease = await Lease.findById(req.body.leaseId, 'listing owner tenant');
    if (!lease || lease.owner.toString() !== req.user.id) return next(errorHandler(404, 'Lease not found!'));

    const kind = req.body.kind;
    const moveIn = kind === 'move_out' ? await Inspection.findOne({ lease: lease._id, kind: 'move_in' }, 'rooms') : null;

    const inspection = await Inspection.create({
      lease: lease._id,
      listing: lease.listing,
      owner: lease.owner,
      tenant: lease.tenant,
      kind,
      // A move-out report starts from the move-in rooms so the two line up.
      rooms: moveIn ? moveIn.rooms.map((r) => ({ name: r.name, items: r.items.map((i) => ({ name: i.name })) })) : defaultRooms(),
    });

    res.status(201).json(await view(await populate(Inspection.findById(inspection._id)), 'owner'));
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, `This lease already has a ${KIND_NAMES[req.body.kind]} report.`));
    }
    next(error);
  }
};

// The reports on one lease that the caller may see.
export const listInspections = async (req, res, next) => {
  try {
    const lease = req.query.leaseId && (await Lease.findById(req.query.leaseId, 'owner tenant').catch(() => null));
    const role = lease && roleOf(lease, req.user.id);
    if (!role) return next(errorHandler(404, 'Lease not found!'));

    const inspections = await Inspection.find({ lease: lease._id }, '-rooms').sort({ kind: 1 });
    res.status(200).json(inspections.filter((i) => visibleTo(i, role)));
  } catch (error) {
    next(error);
  }
};

export const getInspection = async (req, res, next) => {
  try {
    const { inspection, role } = await loadInspection(req, next);
    if (!inspection) return;
    res.status(200).json(await view(inspection, role));
  } catch (error) {
    next(error);
  }
};

const EDITABLE = ['draft', 'disputed'];

export const updateInspection = async (req, res, next) => {
  try {
    const { inspection } = await loadInspection(req, next, 'owner');
    if (!inspection) return;
    if (!EDITABLE.includes(inspection.status)) {
      return next(errorHandler(409, 'This report has been sent to the tenant and can no longer be edited.'));
    }
    if (req.body.rooms) inspection.rooms = req.body.rooms;
    if (req.body.summary !== undefined) inspection.summary = req.body.summary;
    await inspection.save();
    res.status(200).json(await view(inspection, 'owner'));
  } catch (error) {
    next(error);
  }
};

// Sends the report to the tenant to sign.
export const submitInspection = async (req, res, next) => {
  try {
    const { inspection } = await loadInspection(req, next, 'owner');
    if (!inspection) return;
    if (!EDITABLE.includes(inspection.status)) return next(errorHandler(409, `This report is already ${inspection.status}.`));
    if (!inspection.rooms.some((r) => r.items.length > 0)) {
      return next(errorHandler(400, 'Add at least one item before sending the report.'));
    }

    Object.assign(inspection, { status: 'submitted', submittedAt: new Date(), dispute: '' });
    await inspection.save();

    await notifyInspectionSubmitted({
      recipient: inspection.tenant._id,
      ownerName: inspection.owner.username,
      kind: inspection.kind,
      listingName: inspection.listing?.name ?? 'your home',
      inspectionId: inspection._id,
    });
    res.status(200).json(await view(inspection, 'owner'));
  } catch (error) {
    next(error);
  }
};

// The tenant agrees (sign) or disagrees (dispute) with a submitted report.
const answer = (signed) => async (req, res, next) => {
  try {
    const { inspection } = await loadInspection(req, next, 'tenant');
    if (!inspection) return;
    if (inspection.status !== 'submitted') {
      return next(errorHandler(409, `This report is ${inspection.status} and can't be ${signed ? 'signed' : 'disputed'}.`));
    }

    if (signed) Object.assign(inspection, { status: 'signed', signedAt: new Date() });
    else Object.assign(inspection, { status: 'disputed', dispute: req.body.reason });
    await inspection.save();

    const tenant = await User.findById(req.user.id, 'username');
    await notifyInspectionAnswered({
      recipient: inspection.owner._id,
      tenantName: tenant?.username ?? 'Your tenant',
      kind: inspection.kind,
      signed,
      inspectionId: inspection._id,
    });
    res.status(200).json(await view(inspection, 'tenant'));
  } catch (error) {
    next(error);
  }
};

export const signInspection = answer(true);
export const disputeInspection = answer(false);

// Owners can throw away a draft they haven't sent yet.
export const deleteInspection = async (req, res, next) => {
  try {
    const { inspection } = await loadInspection(req, next, 'owner');
    if (!inspection) return;
    if (inspection.status !== 'draft') return next(errorHandler(409, 'Only a draft report can be deleted.'));
    await inspection.deleteOne();
    res.status(200).json({ deleted: true });
  } catch (error) {
    next(error);
  }
};
