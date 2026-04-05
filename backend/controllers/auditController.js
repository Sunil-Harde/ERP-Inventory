const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get all audit logs (paginated, filterable)
 * @route   GET /api/v1/audit/logs
 * @access  Admin
 */
const getLogs = async (req, res, next) => {
  try {
    const {
      action, userId, itemCode,
      startDate, endDate,
      page = 1, limit = 30,
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (itemCode) query.itemCode = itemCode.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audit logs for a specific user
 * @route   GET /api/v1/audit/logs/user/:userId
 * @access  Admin
 */
const getUserLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments({ userId: req.params.userId });

    const logs = await AuditLog.find({ userId: req.params.userId })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogs,
  getUserLogs,
};
