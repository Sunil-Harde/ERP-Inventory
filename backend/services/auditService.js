const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry.
 *
 * @param {string} action - The action performed (from AUDIT_ACTIONS)
 * @param {object} user - The user who performed the action (req.user)
 * @param {object} [extra] - Additional fields { itemCode, quantity, details }
 */
const logAction = async (action, user, extra = {}) => {
  try {
    await AuditLog.create({
      action,
      userId: user._id || user.id,
      userName: user.name,
      userRole: user.role,
      itemCode: extra.itemCode || null,
      quantity: extra.quantity || null,
      details: extra.details || null,
    });
  } catch (error) {
    // Don't break the main flow if audit logging fails
    console.error('⚠️  Audit log failed:', error.message);
  }
};

module.exports = { logAction };
