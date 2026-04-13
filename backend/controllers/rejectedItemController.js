const RejectedItem = require('../models/RejectedItem');

/**
 * @desc    Get all rejected items
 * @route   GET /api/v1/rejected-items
 * @access  Admin, STAFF_QUALITY
 */
const getRejectedItems = async (req, res, next) => {
  try {
    const { itemCode, page = 1, limit = 20 } = req.query;

    const query = {};
    if (itemCode) query.itemCode = itemCode.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await RejectedItem.countDocuments(query);

    const items = await RejectedItem.find(query)
      .populate('checkedBy', 'name email')
      .populate('qualityInspection', 'quantity status')
      .populate('purchaseOrder', 'poNumber supplier')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get rejected items summary stats
 * @route   GET /api/v1/rejected-items/stats
 * @access  Admin, STAFF_QUALITY
 */
const getRejectedStats = async (req, res, next) => {
  try {
    const totalRejected = await RejectedItem.countDocuments();
    const totalQty = await RejectedItem.aggregate([
      { $group: { _id: null, total: { $sum: '$rejectedQty' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEntries: totalRejected,
        totalRejectedQty: totalQty[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRejectedItems,
  getRejectedStats,
};
