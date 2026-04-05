const QualityInspection = require('../models/QualityInspection');
const {
  approveInspection,
  rejectInspection,
} = require('../services/qualityService');

/**
 * @desc    Get all quality inspections
 * @route   GET /api/v1/quality
 * @access  STAFF_QUALITY, Admin
 */
const getInspections = async (req, res, next) => {
  try {
    const { status, itemCode, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (itemCode) query.itemCode = itemCode.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await QualityInspection.countDocuments(query);

    const inspections = await QualityInspection.find(query)
      .populate('purchaseOrder', 'poNumber supplier')
      .populate('inspectedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: inspections.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: inspections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single quality inspection
 * @route   GET /api/v1/quality/:id
 * @access  STAFF_QUALITY, Admin
 */
const getInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findById(req.params.id)
      .populate('purchaseOrder', 'poNumber supplier')
      .populate('inspectedBy', 'name email');

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Quality inspection not found',
      });
    }

    res.status(200).json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a quality inspection (auto inward to inventory)
 * @route   PUT /api/v1/quality/:id/approve
 * @access  STAFF_QUALITY
 */
const approve = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const result = await approveInspection(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `Inspection approved. ${result.inspection.quantity} units of ${result.item.itemCode} added to inventory.`,
      data: {
        inspection: result.inspection,
        item: result.item,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a quality inspection
 * @route   PUT /api/v1/quality/:id/reject
 * @access  STAFF_QUALITY
 */
const reject = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required for rejection',
      });
    }

    const inspection = await rejectInspection(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `Inspection rejected for ${inspection.itemCode}`,
      data: inspection,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInspections,
  getInspection,
  approve,
  reject,
};
