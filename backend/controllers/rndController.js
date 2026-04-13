const RnDRequest = require('../models/RnDRequest');
const BOM = require('../models/BOM');
const Transaction = require('../models/Transaction');
const {
  createRequest,
  approveRequest,
  rejectRequest,
  issueMaterials,
} = require('../services/rndService');
const {
  createBOM,
  approveBOM,
  issueBOM,
  getProductionReceipts,
  rejectBOM, // ✨ NEW: Imported the reject logic from bomService
} = require('../services/bomService');

// ─────────────────────────────────────────────────────────────────────────────
// R&D Material Requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Create a new R&D material request
 * @route   POST /api/v1/rnd/request
 * @access  STAFF_RND
 */
const createRnDRequest = async (req, res, next) => {
  try {
    const { items, purpose } = req.body;

    if (!items || items.length === 0 || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Items and purpose are required',
      });
    }

    const request = await createRequest({ items, purpose }, req.user);

    res.status(201).json({
      success: true,
      message: `R&D request ${request.requestNumber} created successfully`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all R&D requests
 * @route   GET /api/v1/rnd/requests
 * @access  STAFF_RND, Admin
 */
const getRnDRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    // Non-admin can see only their own requests
    if (req.user.role !== 'ADMIN') {
      query.requestedBy = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await RnDRequest.countDocuments(query);

    const requests = await RnDRequest.find(query)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single R&D request
 * @route   GET /api/v1/rnd/request/:id
 * @access  STAFF_RND, Admin
 */
const getRnDRequest = async (req, res, next) => {
  try {
    const request = await RnDRequest.findById(req.params.id)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'R&D request not found',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve R&D request
 * @route   PUT /api/v1/rnd/request/:id/approve
 * @access  Admin, STAFF_STORE
 */
const approveRnDRequest = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const request = await approveRequest(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `R&D request ${request.requestNumber} approved`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject R&D request
 * @route   PUT /api/v1/rnd/request/:id/reject
 * @access  Admin, STAFF_STORE
 */
const rejectRnDRequest = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required for rejection',
      });
    }

    const request = await rejectRequest(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `R&D request ${request.requestNumber} rejected`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue materials for an approved R&D request
 * @route   PUT /api/v1/rnd/request/:id/issue
 * @access  STAFF_STORE
 */
const issueRnDMaterials = async (req, res, next) => {
  try {
    const result = await issueMaterials(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: `Materials issued for R&D request ${result.request.requestNumber}`,
      data: {
        request: result.request,
        transactions: result.transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get R&D usage logs (OUT transactions from rnd department)
 * @route   GET /api/v1/rnd/usage-logs
 * @access  STAFF_RND, Admin
 */
const getUsageLogs = async (req, res, next) => {
  try {
    const { itemCode, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {
      department: 'rnd',
      type: 'OUT',
    };

    if (itemCode) query.itemCode = itemCode.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(query);

    const logs = await Transaction.find(query)
      .populate('performedBy', 'name email')
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

// ─────────────────────────────────────────────────────────────────────────────
// BOM (Bill of Materials) — inside R&D module
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Create a new BOM
 * @route   POST /api/v1/rnd/bom
 * @access  ADMIN, STAFF_RND
 */
const createBOMHandler = async (req, res, next) => {
  try {
    const { producedItem, consumedItems, warehouseFrom, warehouseTo, purpose } = req.body;

    if (!producedItem || !consumedItems || consumedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Produced item and at least one consumed item are required',
      });
    }

    const bom = await createBOM(
      { producedItem, consumedItems, warehouseFrom, warehouseTo, purpose },
      req.user
    );

    res.status(201).json({
      success: true,
      message: `BOM ${bom.bomNumber} created successfully`,
      data: bom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all BOMs
 * @route   GET /api/v1/rnd/bom
 * @access  ADMIN, STAFF_RND, STAFF_STORE
 */
const listBOMs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await BOM.countDocuments(query);

    const boms = await BOM.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: boms.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: boms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve BOM & reserve stock (Warehouse Shop1)
 * @route   PUT /api/v1/rnd/bom/:id/approve
 * @access  ADMIN, STAFF_STORE
 */
const approveBOMHandler = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const bom = await approveBOM(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `BOM ${bom.bomNumber} approved — stock reserved`,
      data: bom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject BOM (Warehouse Shop1)
 * @route   PUT /api/v1/rnd/bom/:id/reject
 * @access  ADMIN, STAFF_STORE
 */
// ✨ NEW: The Reject BOM Handler added here
const rejectBOMHandler = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const bom = await rejectBOM(req.params.id, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `BOM ${bom.bomNumber} rejected`,
      data: bom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue BOM materials & produce item (Warehouse Shop2)
 * @route   PUT /api/v1/rnd/bom/:id/issue
 * @access  ADMIN, STAFF_STORE
 */
const issueBOMHandler = async (req, res, next) => {
  try {
    const result = await issueBOM(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: `BOM ${result.bom.bomNumber} issued — ${result.producedItem.itemName} produced`,
      data: {
        bom: result.bom,
        transaction: result.transaction,
        producedItem: result.producedItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get production receipts
 * @route   GET /api/v1/rnd/receipts
 * @access  ADMIN, STAFF_RND, STAFF_STORE
 */
const getReceipts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getProductionReceipts({}, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRnDRequest,
  getRnDRequests,
  getRnDRequest,
  approveRnDRequest,
  rejectRnDRequest,
  issueRnDMaterials,
  getUsageLogs,
  
  // BOM
  createBOMHandler,
  listBOMs,
  approveBOMHandler,
  rejectBOMHandler, // ✨ NEW: Exported the handler so your routes can use it
  issueBOMHandler,
  getReceipts,
};