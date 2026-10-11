import AuditLog from '../models/auditLog.model.js';

// Records a privileged action. Called from admin controllers after the
// action succeeded; like notifications, it must never break the request,
// so failures are logged and swallowed.
export const recordAudit = async ({ actor, action, targetType, targetId = null, targetLabel = '', reason = '', meta = {} }) => {
  try {
    return await AuditLog.create({ actor, action, targetType, targetId, targetLabel, reason, meta });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
    return null;
  }
};
