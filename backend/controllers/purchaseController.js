const PurchaseOrder = require('../models/PurchaseOrder');
const { createPO, receivePO } = require('../services/purchaseService');
const { AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('../services/auditService');

/**
 * @desc    Create a purchase order
 * @route   POST /api/v1/purchase
 * @access  STAFF_PURCHASE, Admin
 */
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, items, remarks } = req.body;

    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one item are required',
      });
    }

    const po = await createPO({ supplier, items, remarks }, req.user);

    res.status(201).json({
      success: true,
      message: `Purchase order ${po.poNumber} created successfully`,
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all purchase orders
 * @route   GET /api/v1/purchase
 * @access  STAFF_PURCHASE, Admin
 */
const getPurchaseOrders = async (req, res, next) => {
  try {
    const {
      status, supplier, search,
      page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (supplier) query.supplier = { $regex: supplier, $options: 'i' };
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PurchaseOrder.countDocuments(query);

    const orders = await PurchaseOrder.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single purchase order
 * @route   GET /api/v1/purchase/:id
 * @access  Private
 */
const getPurchaseOrder = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Receive materials for a PO
 * @route   PUT /api/v1/purchase/:id/receive
 * @access  STAFF_PURCHASE
 */
const receiveMaterials = async (req, res, next) => {
  try {
    const { receivedItems } = req.body;

    if (!receivedItems || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Received items data is required',
      });
    }

    const result = await receivePO(req.params.id, receivedItems, req.user);

    res.status(200).json({
      success: true,
      message: `Materials received for PO ${result.po.poNumber}. ${result.inspections.length} quality inspection(s) created.`,
      data: {
        purchaseOrder: result.po,
        inspections: result.inspections,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a purchase order
 * @route   PUT /api/v1/purchase/:id
 * @access  STAFF_PURCHASE, Admin
 */
const updatePurchaseOrder = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (po.status !== 'ORDERED') {
      return res.status(400).json({
        success: false,
        message: 'Can only update purchase orders with ORDERED status',
      });
    }

    const { supplier, items, remarks } = req.body;
    if (supplier) po.supplier = supplier;
    if (items) po.items = items;
    if (remarks) po.remarks = remarks;

    await po.save();

    await logAction(AUDIT_ACTIONS.PO_UPDATED, req.user, {
      details: { poNumber: po.poNumber },
    });

    res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: po,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  receiveMaterials,
  updatePurchaseOrder,
};
