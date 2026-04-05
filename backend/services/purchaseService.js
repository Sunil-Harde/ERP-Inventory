const PurchaseOrder = require('../models/PurchaseOrder');
const QualityInspection = require('../models/QualityInspection');
const { PO_STATUS, QC_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');

/**
 * Create a new purchase order.
 */
const createPO = async (data, user) => {
  const po = await PurchaseOrder.create({
    supplier: data.supplier,
    items: data.items,
    remarks: data.remarks,
    createdBy: user._id,
  });

  await logAction(AUDIT_ACTIONS.PO_CREATED, user, {
    details: { poNumber: po.poNumber, supplier: po.supplier, itemCount: po.items.length },
  });

  return po;
};

/**
 * Receive materials for a PO — creates quality inspections.
 *
 * @param {string} poId - Purchase Order ID
 * @param {Array} receivedItems - [{ itemCode, receivedQty }]
 * @param {object} user - The user performing the action
 */
const receivePO = async (poId, receivedItems, user) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    const error = new Error('Purchase order not found');
    error.statusCode = 404;
    throw error;
  }

  if (po.status === PO_STATUS.RECEIVED) {
    const error = new Error('Purchase order already fully received');
    error.statusCode = 400;
    throw error;
  }

  const inspections = [];

  for (const received of receivedItems) {
    // Find matching item in PO
    const poItem = po.items.find(
      (i) => i.itemCode.toUpperCase() === received.itemCode.toUpperCase()
    );

    if (!poItem) {
      const error = new Error(`Item ${received.itemCode} not found in PO ${po.poNumber}`);
      error.statusCode = 400;
      throw error;
    }

    // Update received quantity
    poItem.receivedQty = (poItem.receivedQty || 0) + received.receivedQty;

    // Create quality inspection
    const inspection = await QualityInspection.create({
      purchaseOrder: po._id,
      itemCode: poItem.itemCode,
      itemName: poItem.itemName,
      quantity: received.receivedQty,
      uom: poItem.uom,
      status: QC_STATUS.PENDING,
    });

    inspections.push(inspection);
  }

  // Check if all items are fully received
  const allReceived = po.items.every((i) => i.receivedQty >= i.quantity);
  const someReceived = po.items.some((i) => i.receivedQty > 0);

  if (allReceived) {
    po.status = PO_STATUS.RECEIVED;
  } else if (someReceived) {
    po.status = PO_STATUS.PARTIALLY_RECEIVED;
  }

  await po.save();

  await logAction(AUDIT_ACTIONS.PO_RECEIVED, user, {
    details: {
      poNumber: po.poNumber,
      receivedItems: receivedItems.length,
      newStatus: po.status,
    },
  });

  return { po, inspections };
};

module.exports = {
  createPO,
  receivePO,
};
