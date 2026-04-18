const BOM = require('../models/BOM');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { BOM_STATUS, TXN_TYPE, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');
const { checkAndAlertLowStock } = require('./whatsappService');

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
 * @desc Approve a BOM (Shop1) — ✨ IMMEDIATELY DEDUCTS STOCK ✨
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

  // ✨ Validate and DEDUCT stock for each consumed raw material immediately
  for (const consumed of bom.consumedItems) {
    const item = await Item.findOne({ itemCode: consumed.itemCode });
    if (!item) {
      const error = new Error(`Item not found: ${consumed.itemCode}`);
      error.statusCode = 404;
      throw error;
    }

    // Checking actual stock instead of reserved
    if (item.stock < consumed.quantity) {
      const error = new Error(
        `Insufficient available stock for ${consumed.itemCode}. ` +
        `Current Stock: ${item.stock}, Required: ${consumed.quantity}`
      );
      error.statusCode = 400;
      throw error;
    }

    // ✨ Deduct the physical stock instantly
    item.stock -= consumed.quantity;
    await item.save();

    // Check low stock alert
    checkAndAlertLowStock(item).catch(err =>
      console.error('[WhatsApp] BOM approval alert failed:', err.message)
    );
  }

  // Update BOM status to APPROVED
  bom.status = BOM_STATUS.APPROVED;
  bom.approvedBy = user._id;
  bom.reserved = false; // Set to false because it is physically deducted now
  if (remarks) bom.remarks = remarks;
  await bom.save();

  await logAction(AUDIT_ACTIONS.BOM_APPROVED, user, {
    details: {
      bomNumber: bom.bomNumber,
      producedItem: bom.producedItem.itemCode,
      message: 'Stock instantly deducted upon Shop 1 Approval.'
    },
  });

  return bom;
};

/**
 * @desc Reject a BOM (Shop1) — ✨ REFUNDS STOCK IF ALREADY APPROVED ✨
 */
const rejectBOM = async (bomId, user, remarks) => {
  const bom = await BOM.findById(bomId);
  if (!bom) {
    const error = new Error('BOM not found');
    error.statusCode = 404;
    throw error;
  }

  // ✨ If an Admin rejects a BOM that was ALREADY approved, we must refund the stock!
  if (bom.status === BOM_STATUS.APPROVED) {
    for (const consumed of bom.consumedItems) {
      const item = await Item.findOne({ itemCode: consumed.itemCode });
      if (item) {
        item.stock += consumed.quantity; // Refund the stock back to the shelf
        await item.save();
      }
    }
  }
  
  bom.status = 'REJECTED'; 
  bom.remarks = remarks;
  await bom.save();

  return bom;
};

/**
 * @desc Issue a BOM (Shop2) — ✨ ONLY CREATES THE FATHER PRODUCT ✨
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

  // ✨ We removed the deduction loop from here because Shop 1 already deducted it! ✨

  // 1. Create or Update the Finished Good (Father Product)
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

  // 2. Create a single comprehensive PRODUCTION transaction receipt
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

  // 3. Update BOM status to finally ISSUED
  bom.status = BOM_STATUS.ISSUED;
  bom.issuedBy = user._id;
  await bom.save();

  // 4. Log the final action for audit trails
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
 * @desc Update a BOM and automatically reconcile Inventory Stock
 */
const updateBOM = async (bomId, updateData, user) => {
  const bom = await BOM.findById(bomId);
  
  if (!bom) {
    const error = new Error('BOM not found');
    error.statusCode = 404;
    throw error;
  }

  // If we are updating the consumed materials array
  if (updateData.consumedItems) {
    
    for (const newItem of updateData.consumedItems) {
      // Find what the old quantity was before the admin edited it
      const oldItem = bom.consumedItems.find(i => i.itemCode === newItem.itemCode);
      const oldQty = oldItem ? Number(oldItem.quantity) : 0;
      const newQty = Number(newItem.quantity);
      
      // Calculate the difference
      const diff = newQty - oldQty; 

      // If the quantity actually changed, we must adjust the inventory
      if (diff !== 0) {
        const inventoryItem = await Item.findOne({ itemCode: newItem.itemCode });
        
        if (inventoryItem) {
          // ✨ NEW: Since stock is physically deducted at APPROVED, both APPROVED and ISSUED require actual stock adjustments
          if (bom.status === BOM_STATUS.ISSUED || bom.status === BOM_STATUS.APPROVED) {
            inventoryItem.stock -= diff; 
            await inventoryItem.save();

            // Check low stock alert after BOM edit
            if (diff > 0) {
              checkAndAlertLowStock(inventoryItem).catch(err =>
                console.error('[WhatsApp] BOM update alert failed:', err.message)
              );
            }
          }
        }
      }
    }
    
    // Save the new array to the BOM document
    bom.consumedItems = updateData.consumedItems;
  }

  if (updateData.purpose) bom.purpose = updateData.purpose;

  await bom.save();

  return bom;
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
  updateBOM,
  getProductionReceipts,
};