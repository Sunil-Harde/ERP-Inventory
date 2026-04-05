const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const QualityInspection = require('../models/QualityInspection');
const RnDRequest = require('../models/RnDRequest');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { TXN_TYPE } = require('../utils/constants');
const { predictStockDepletion } = require('../services/predictionService');

/**
 * @desc    Get dashboard overview stats
 * @route   GET /api/v1/dashboard/stats
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalItems,
      lowStockCount,
      totalTransactions,
      pendingPOs,
      pendingQC,
      pendingRnD,
      totalUsers,
    ] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ $expr: { $lte: ['$stock', '$minStock'] } }),
      Transaction.countDocuments(),
      PurchaseOrder.countDocuments({ status: 'ORDERED' }),
      QualityInspection.countDocuments({ status: 'PENDING' }),
      RnDRequest.countDocuments({ status: 'PENDING' }),
      User.countDocuments({ isActive: true }),
    ]);

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTxnCount = await Transaction.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Stock value summary
    const stockSummary = await Item.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          avgStock: { $avg: '$stock' },
          itemCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        lowStockCount,
        totalTransactions,
        recentTransactions: recentTxnCount,
        pendingPurchaseOrders: pendingPOs,
        pendingQualityChecks: pendingQC,
        pendingRnDRequests: pendingRnD,
        activeUsers: totalUsers,
        stockSummary: stockSummary[0] || { totalStock: 0, avgStock: 0, itemCount: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get top used items (by OUT transaction volume)
 * @route   GET /api/v1/dashboard/top-items
 * @access  Private
 */
const getTopItems = async (req, res, next) => {
  try {
    const { days = 30, limit = 10 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const topItems = await Transaction.aggregate([
      {
        $match: {
          type: TXN_TYPE.OUT,
          createdAt: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: '$itemCode',
          itemName: { $first: '$itemName' },
          totalQuantity: { $sum: '$quantity' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      data: topItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department-wise usage
 * @route   GET /api/v1/dashboard/department-usage
 * @access  Admin
 */
const getDepartmentUsage = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const usage = await Transaction.aggregate([
      {
        $match: {
          type: TXN_TYPE.OUT,
          createdAt: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: '$department',
          totalQuantity: { $sum: '$quantity' },
          transactionCount: { $sum: 1 },
          uniqueItems: { $addToSet: '$itemCode' },
        },
      },
      {
        $project: {
          department: '$_id',
          totalQuantity: 1,
          transactionCount: 1,
          uniqueItemCount: { $size: '$uniqueItems' },
          _id: 0,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: usage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get staff activity summary
 * @route   GET /api/v1/dashboard/staff-activity
 * @access  Admin
 */
const getStaffActivity = async (req, res, next) => {
  try {
    const { days = 30, limit = 20 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const activity = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userRole: { $first: '$userRole' },
          actionCount: { $sum: 1 },
          actions: { $addToSet: '$action' },
          lastAction: { $max: '$createdAt' },
        },
      },
      { $sort: { actionCount: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    AI: Predict stock depletion for an item
 * @route   GET /api/v1/dashboard/stock-prediction/:itemCode
 * @access  Admin
 */
const getStockPrediction = async (req, res, next) => {
  try {
    const itemCode = req.params.itemCode.toUpperCase();

    const item = await Item.findOne({ itemCode });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found: ${itemCode}`,
      });
    }

    const prediction = await predictStockDepletion(itemCode, item.stock);

    res.status(200).json({
      success: true,
      data: {
        itemCode: item.itemCode,
        itemName: item.itemName,
        ...prediction,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getTopItems,
  getDepartmentUsage,
  getStaffActivity,
  getStockPrediction,
};
