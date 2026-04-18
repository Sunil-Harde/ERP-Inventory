const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { TXN_TYPE, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');
const { parseQR } = require('../utils/qrParser');
const { checkAndAlertLowStock } = require('./whatsappService');

/**
 * Process inward — increase stock from QR scan data.
 */
const processInward = async (qrData, user, remarks = '') => {
  const { itemCode, packQty } = parseQR(qrData);

  const item = await Item.findOne({ itemCode });
  if (!item) {
    const error = new Error(`Item not found: ${itemCode}`);
    error.statusCode = 404;
    throw error;
  }

  // Increase stock
  item.stock += packQty;

  // Reset alert flag since stock was replenished
  if (item.alertSent && item.stock > item.minStock) {
    item.alertSent = false;
  }

  await item.save();

  // Create transaction
  const transaction = await Transaction.create({
    itemCode,
    itemName: item.itemName,
    type: TXN_TYPE.IN,
    quantity: packQty,
    performedBy: user._id,
    department: user.department,
    remarks: remarks || `Inward via QR scan`,
  });

  // Audit log
  await logAction(AUDIT_ACTIONS.STOCK_IN, user, {
    itemCode,
    quantity: packQty,
    details: { newStock: item.stock },
  });

  return { item, transaction };
};

/**
 * Process issue — decrease stock.
 */
const processIssue = async (itemCode, quantity, user, remarks = '') => {
  const item = await Item.findOne({ itemCode: itemCode.toUpperCase() });
  if (!item) {
    const error = new Error(`Item not found: ${itemCode}`);
    error.statusCode = 404;
    throw error;
  }

  if (item.stock < quantity) {
    const error = new Error(
      `Insufficient stock for ${itemCode}. Available: ${item.stock}, Requested: ${quantity}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Decrease stock
  item.stock -= quantity;
  await item.save();

  // Create transaction
  const transaction = await Transaction.create({
    itemCode: item.itemCode,
    itemName: item.itemName,
    type: TXN_TYPE.OUT,
    quantity,
    performedBy: user._id,
    department: user.department,
    remarks: remarks || `Issue`,
  });

  // Audit log
  await logAction(AUDIT_ACTIONS.STOCK_OUT, user, {
    itemCode: item.itemCode,
    quantity,
    details: { newStock: item.stock },
  });

  // Check & send WhatsApp alert if stock fell below threshold
  checkAndAlertLowStock(item).catch(err => {
    console.error('[WhatsApp] Alert check failed:', err.message);
  });

  return { item, transaction };
};

/**
 * Get items with low stock (stock <= minStock).
 */
const getLowStockItems = async () => {
  return Item.find({
    $expr: { $lte: ['$stock', '$minStock'] },
  }).sort({ stock: 1 });
};

module.exports = {
  processInward,
  processIssue,
  getLowStockItems,
};
