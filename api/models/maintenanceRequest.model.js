import mongoose from 'mongoose';

export const MAINTENANCE_CATEGORIES = ['plumbing', 'electrical', 'heating', 'appliance', 'pest', 'structural', 'other'];
export const MAINTENANCE_URGENCIES = ['low', 'normal', 'urgent'];
// open -> in_progress -> resolved -> closed; a resolved request can be
// reopened by the tenant if the fix didn't work.
export const MAINTENANCE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const updateSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true, maxlength: 2000, default: '' },
    // Set when this update changed the status.
    status: { type: String, enum: MAINTENANCE_STATUSES },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A problem a tenant reports with a rented home, tracked until it's fixed.
const maintenanceRequestSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, enum: MAINTENANCE_CATEGORIES, required: true },
    urgency: { type: String, enum: MAINTENANCE_URGENCIES, default: 'normal' },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: 'open' },
    updates: { type: [updateSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

maintenanceRequestSchema.index({ owner: 1, status: 1, updatedAt: -1 });
maintenanceRequestSchema.index({ tenant: 1, updatedAt: -1 });

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

export default MaintenanceRequest;
