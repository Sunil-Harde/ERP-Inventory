const QRCode = require('qrcode');
const Item = require('../models/Item');
const { AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('../services/auditService');
const {
  processInward,
  processIssue,
  getLowStockItems,
} = require('../services/inventoryService');
const { parseQR } = require('../utils/qrParser');

/**
 * @desc    Get all inventory items
 * @route   GET /api/v1/inventory
 * @access  Private
 */
const getItems = async (req, res, next) => {
  try {
    const {
      search, category, lowStock,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { itemCode: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } },
      ];
    }
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const total = await Item.countDocuments(query);

    const items = await Item.find(query)
      .sort(sort)
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
 * @desc    Get single item
 * @route   GET /api/v1/inventory/:id
 * @access  Private
 */
const getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new item
 * @route   POST /api/v1/inventory
 * @access  Admin, STAFF_STORE
 */
const createItem = async (req, res, next) => {
  try {
    const { itemCode, itemName, stock, uom, category, minStock, description } = req.body;

    const item = await Item.create({
      itemCode,
      itemName,
      stock: stock || 0,
      uom,
      category,
      minStock: minStock || 10,
      description,
    });

    await logAction(AUDIT_ACTIONS.ITEM_CREATED, req.user, {
      itemCode: item.itemCode,
      details: { itemName: item.itemName, stock: item.stock },
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an item
 * @route   PUT /api/v1/inventory/:id
 * @access  Admin, STAFF_STORE
 */
const updateItem = async (req, res, next) => {
  try {
    const { itemName, uom, category, minStock, description } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (itemName) item.itemName = itemName;
    if (uom) item.uom = uom;
    if (category) item.category = category;
    if (minStock !== undefined) item.minStock = minStock;
    if (description !== undefined) item.description = description;

    await item.save();

    await logAction(AUDIT_ACTIONS.ITEM_UPDATED, req.user, {
      itemCode: item.itemCode,
      details: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Inward stock via QR scan
 * @route   POST /api/v1/inventory/inward
 * @access  STAFF_STORE, STAFF_QUALITY
 */
const inwardStock = async (req, res, next) => {
  try {
    const { qrData, remarks } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required',
      });
    }

    const result = await processInward(qrData, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `Stock increased by ${result.transaction.quantity} for ${result.item.itemCode}`,
      data: {
        item: result.item,
        transaction: result.transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue stock
 * @route   POST /api/v1/inventory/issue
 * @access  STAFF_STORE, STAFF_RND
 */
const issueStock = async (req, res, next) => {
  try {
    const { itemCode, quantity, remarks } = req.body;

    if (!itemCode || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item code and quantity are required',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0',
      });
    }

    const result = await processIssue(itemCode, quantity, req.user, remarks);

    res.status(200).json({
      success: true,
      message: `Stock decreased by ${quantity} for ${result.item.itemCode}`,
      data: {
        item: result.item,
        transaction: result.transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock items
 * @route   GET /api/v1/inventory/low-stock
 * @access  Private
 */
const lowStock = async (req, res, next) => {
  try {
    const items = await getLowStockItems();

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse QR code string
 * @route   POST /api/v1/inventory/parse-qr
 * @access  Private
 */
const parseQRCode = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required',
      });
    }

    const parsed = parseQR(qrData);

    // Check if item exists
    const item = await Item.findOne({ itemCode: parsed.itemCode });

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        itemExists: !!item,
        itemName: item ? item.itemName : null,
        currentStock: item ? item.stock : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate QR code for an inventory item
 * @route   GET /api/v1/inventory/qr/:itemCode
 * @access  Private
 * @query   qty — pack quantity to encode (default: 1)
 */
const getItemQR = async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const qty = parseInt(req.query.qty, 10) || 1;

    const item = await Item.findOne({ itemCode: itemCode.toUpperCase() });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found: ${itemCode}`,
      });
    }

    const qrString = `${item.itemCode}|${qty}`;

    // Generate QR as base64 PNG data URL
    const qrDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uom,
        currentStock: item.stock,
        packQty: qty,
        qrString,
        qrImage: qrDataURL,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getItems,
  getItem,
  createItem,
  updateItem,
  inwardStock,
  issueStock,
  lowStock,
  parseQRCode,
  getItemQR,
};
