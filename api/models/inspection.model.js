import mongoose from 'mongoose';
import { CONDITION_VALUES } from '../utils/inspections.js';

export const INSPECTION_KINDS = ['move_in', 'move_out'];
// draft -> submitted -> signed, or submitted -> disputed -> (owner edits)
// -> submitted again. A signed report can't change.
export const INSPECTION_STATUSES = ['draft', 'submitted', 'disputed', 'signed'];

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    condition: { type: String, enum: CONDITION_VALUES, default: 'good' },
    note: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false }
);

// A room-by-room condition report the owner writes when a tenant moves in
// or out, and the tenant signs off (or disputes).
const inspectionSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: INSPECTION_KINDS, required: true },
    status: { type: String, enum: INSPECTION_STATUSES, default: 'draft' },
    rooms: { type: [roomSchema], default: [] },
    // General remarks, e.g. meter readings or keys handed over.
    summary: { type: String, trim: true, maxlength: 2000, default: '' },
    submittedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    // The tenant's reason when they dispute the report.
    dispute: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

inspectionSchema.index({ lease: 1, kind: 1 }, { unique: true });
inspectionSchema.index({ tenant: 1, status: 1 });

const Inspection = mongoose.model('Inspection', inspectionSchema);

export default Inspection;
