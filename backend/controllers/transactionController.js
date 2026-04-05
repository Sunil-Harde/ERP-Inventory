const Transaction = require('../models/Transaction');

/**
 * @desc    Get all transactions (with filters)
 * @route   GET /api/v1/transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      itemCode, type, department, startDate, endDate,
      page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (itemCode) query.itemCode = itemCode.toUpperCase();
    if (type) query.type = type;
    if (department) query.department = department;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .populate('performedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transactions for a specific item
 * @route   GET /api/v1/transactions/item/:itemCode
 * @access  Private
 */
const getItemTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const itemCode = req.params.itemCode.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments({ itemCode });

    const transactions = await Transaction.find({ itemCode })
      .populate('performedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transactions by user
 * @route   GET /api/v1/transactions/user/:userId
 * @access  Admin
 */
const getUserTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments({ performedBy: req.params.userId });

    const transactions = await Transaction.find({ performedBy: req.params.userId })
      .populate('performedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getItemTransactions,
  getUserTransactions,
};
