import mongoose from 'mongoose';

// Every privileged action worth keeping a record of. Kept in one place so
// the schema, the admin UI labels and the tests agree.
export const AUDIT_ACTIONS = [
  'hide_listing',
  'unhide_listing',
  'suspend_user',
  'unsuspend_user',
  'resolve_report',
  'dismiss_report',
  'reopen_report',
];

export const AUDIT_TARGET_TYPES = ['listing', 'user', 'report'];

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, enum: AUDIT_TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Human-readable snapshot, e.g. the listing name or the username, so
    // the log still makes sense after the target is deleted.
    targetLabel: { type: String, trim: true, maxlength: 200, default: '' },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
