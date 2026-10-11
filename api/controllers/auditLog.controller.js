import mongoose from 'mongoose';
import AuditLog, { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../models/auditLog.model.js';

const MAX_LIMIT = 200;
const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

// The audit trail, newest first. Optional ?action=, ?targetType= and
// ?actor= filters narrow it down.
export const listAuditLogs = async (req, res, next) => {
  try {
    const limit = toInt(req.query.limit, 50, 1, MAX_LIMIT);
    const filter = {};
    if (AUDIT_ACTIONS.includes(req.query.action)) filter.action = req.query.action;
    if (AUDIT_TARGET_TYPES.includes(req.query.targetType)) filter.targetType = req.query.targetType;
    if (mongoose.isValidObjectId(req.query.actor)) filter.actor = req.query.actor;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate('actor', 'username avatar'),
      AuditLog.countDocuments(filter),
    ]);

    res.set('X-Total-Count', String(total));
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

// Counts per action, for the little summary chips in the admin UI.
export const getAuditSummary = async (req, res, next) => {
  try {
    const counts = await AuditLog.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }]);
    const byAction = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.status(200).json({ total: counts.reduce((sum, c) => sum + c.count, 0), byAction });
  } catch (error) {
    next(error);
  }
};
