const BOM = require('../models/BOM');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { BOM_STATUS, TXN_TYPE, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');

/**
 * @desc Create a new BOM (Recipe).
 */
const createBOM = async (data, user) => {
  const bom = await BOM.create({
    producedItem: data.producedItem,
    consumedItems: data.consumedItems,
    warehouseFrom: data.warehouseFrom || 'SHOP1',
    warehouseTo: data.warehouseTo || 'SHOP2',
    createdBy: user._id,
    purpose: data.purpose // Saves the project name or purpose if provided
  });

  await logAction(AUDIT_ACTIONS.BOM_CREATED, user, {
    details: {
      bomNumber: bom.bomNumber,
      producedItem: bom.producedItem.itemCode,
      materialsCount: bom.consumedItems.length,
      totalCost: bom.totalCost,
    },
  });

  return bom;
};

/**
 * @desc Approve a BOM (Shop1) — reserve stock for all consumed items.
 * Stock is NOT deducted yet, only reserved to prevent double-booking.
 */
const approveBOM = async (bomId, user, remarks = '') => {
  const bom = await BOM.findById(bomId);
  if (!bom) {
    const error = new Error('BOM not found');
    error.statusCode = 404;
    throw error;
  }

  if (bom.status !== BOM_STATUS.CREATED) {
    const error = new Error(`BOM already ${bom.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate and reserve stock for each consumed raw material
  for (const consumed of bom.consumedItems) {
    const item = await Item.findOne({ itemCode: consumed.itemCode });
    if (!item) {
      const error = new Error(`Item not found: ${consumed.itemCode}`);
      error.statusCode = 404;
      throw error;
    }

    const availableStock = item.stock - (item.reservedQty || 0);
    if (availableStock < consumed.quantity) {
      const error = new Error(
        `Insufficient available stock for ${consumed.itemCode}. ` +
        `Available: ${availableStock}, Required: ${consumed.quantity}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Reserve the stock
    item.reservedQty = (item.reservedQty || 0) + consumed.quantity;
    await item.save();
  }

  // Update BOM status to APPROVED
  bom.status = BOM_STATUS.APPROVED;
  bom.approvedBy = user._id;
  bom.reserved = true;
  if (remarks) bom.remarks = remarks;
  await bom.save();

  await logAction(AUDIT_ACTIONS.BOM_APPROVED, user, {
    details: {
      bomNumber: bom.bomNumber,
      producedItem: bom.producedItem.itemCode,
    },
  });

  return bom;
};

/**
 * @desc Reject a BOM (Shop1) — sends it back if materials are missing or incorrect.
 */
const rejectBOM = async (bomId, user, remarks) => {
  const bom = await BOM.findById(bomId);
  if (!bom) {
    const error = new Error('BOM not found');
    error.statusCode = 404;
    throw error;
  }
  
  bom.status = 'REJECTED'; 
  bom.remarks = remarks;
  await bom.save();

  return bom;
};

/**
 * @desc Issue a BOM (Shop2) — deduct consumed materials, clear reservation,
 * add produced item (Father) to inventory, and create a PRODUCTION transaction.
 */
const issueBOM = async (bomId, user) => {
  const bom = await BOM.findById(bomId)
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!bom) {
    const error = new Error('BOM not found');
    error.statusCode = 404;
    throw error;
  }

  if (bom.status !== BOM_STATUS.APPROVED) {
    const error = new Error('Can only issue materials for approved BOMs');
    error.statusCode = 400;
    throw error;
  }

  // 1. Deduct consumed items (Children) and clear their reservations
  for (const consumed of bom.consumedItems) {
    const item = await Item.findOne({ itemCode: consumed.itemCode });
    if (!item) {
      const error = new Error(`Item not found: ${consumed.itemCode}`);
      error.statusCode = 404;
      throw error;
    }

    if (item.stock < consumed.quantity) {
      const error = new Error(
        `Insufficient stock for ${consumed.itemCode}. ` +
        `Stock: ${item.stock}, Required: ${consumed.quantity}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Deduct exact stock and clear the temporary reservation
    item.stock -= consumed.quantity;
    item.reservedQty = Math.max(0, (item.reservedQty || 0) - consumed.quantity);
    await item.save();
  }

  // 2. ✨ Create or Update the Finished Good (Father Product) ✨
  const produced = bom.producedItem;
  let producedItem = await Item.findOne({ itemCode: produced.itemCode });

  if (producedItem) {
    // If it already exists in inventory, just add the new quantity
    producedItem.stock += produced.quantity;
    await producedItem.save();
  } else {
    // If it's a brand new product being built for the first time, create it!
    producedItem = await Item.create({
      itemCode: produced.itemCode,
      itemName: produced.itemName,
      stock: produced.quantity,
      uom: produced.uom,
      category: 'Finished Product',
      minStock: 0,
      description: `Auto-created from BOM ${bom.bomNumber}`,
    });
  }

  // 3. Create a single comprehensive PRODUCTION transaction receipt
  const transaction = await Transaction.create({
    itemCode: produced.itemCode,
    itemName: produced.itemName,
    type: TXN_TYPE.PRODUCTION,
    quantity: produced.quantity,
    performedBy: bom.createdBy._id || bom.createdBy,
    department: 'rnd',
    remarks: `BOM ${bom.bomNumber} — Production Completed`,
    relatedBOM: bom._id,
    producedItem: {
      itemCode: produced.itemCode,
      itemName: produced.itemName,
      quantity: produced.quantity,
      price: produced.price || 0,
      uom: produced.uom,
    },
    consumedItems: bom.consumedItems.map(c => ({
      itemCode: c.itemCode,
      itemName: c.itemName,
      quantity: c.quantity,
      price: c.price || 0,
      uom: c.uom,
    })),
    totalCost: bom.totalCost,
    approvedBy: bom.approvedBy?._id || bom.approvedBy,
    issuedBy: user._id,
  });

  // 4. Update BOM status to finally ISSUED
  bom.status = BOM_STATUS.ISSUED;
  bom.issuedBy = user._id;
  bom.reserved = false;
  await bom.save();

  // 5. Log the final action for audit trails
  await logAction(AUDIT_ACTIONS.BOM_ISSUED, user, {
    details: {
      bomNumber: bom.bomNumber,
      producedItem: produced.itemCode,
      producedQty: produced.quantity,
      totalCost: bom.totalCost,
    },
  });

  return { bom, transaction, producedItem };
};

/**
 * @desc List production receipts (PRODUCTION transactions).
 */
const getProductionReceipts = async (query = {}, page = 1, limit = 20) => {
  const filter = { type: TXN_TYPE.PRODUCTION, ...query };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Transaction.countDocuments(filter);

  const receipts = await Transaction.find(filter)
    .populate('performedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('issuedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return { data: receipts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) };
};

module.exports = {
  createBOM,
  approveBOM,
  rejectBOM,
  issueBOM,
  getProductionReceipts,
};