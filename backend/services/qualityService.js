const QualityInspection = require('../models/QualityInspection');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { QC_STATUS, TXN_TYPE, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');

/**
 * Approve a quality inspection — auto inward items to inventory.
 */
const approveInspection = async (inspectionId, user, remarks = '') => {
  const inspection = await QualityInspection.findById(inspectionId);
  if (!inspection) {
    const error = new Error('Quality inspection not found');
    error.statusCode = 404;
    throw error;
  }

  if (inspection.status !== QC_STATUS.PENDING) {
    const error = new Error(`Inspection already ${inspection.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  // Update inspection
  inspection.status = QC_STATUS.APPROVED;
  inspection.inspectedBy = user._id;
  inspection.remarks = remarks || 'Approved';
  await inspection.save();

  // Find or create item in inventory
  let item = await Item.findOne({ itemCode: inspection.itemCode });

  if (!item) {
    // Auto-create the item if it doesn't exist
    item = await Item.create({
      itemCode: inspection.itemCode,
      itemName: inspection.itemName,
      stock: 0,
      uom: inspection.uom || 'NOS',
      category: 'General',
    });
  }

  // Increase stock
  item.stock += inspection.quantity;
  await item.save();

  // Create IN transaction
  await Transaction.create({
    itemCode: item.itemCode,
    itemName: item.itemName,
    type: TXN_TYPE.IN,
    quantity: inspection.quantity,
    performedBy: user._id,
    department: user.department,
    remarks: `QC Approved - PO Inward`,
    relatedPO: inspection.purchaseOrder,
    relatedQC: inspection._id,
  });

  // Audit
  await logAction(AUDIT_ACTIONS.QC_APPROVED, user, {
    itemCode: item.itemCode,
    quantity: inspection.quantity,
    details: { inspectionId: inspection._id, newStock: item.stock },
  });

  return { inspection, item };
};

/**
 * Reject a quality inspection.
 */
const rejectInspection = async (inspectionId, user, remarks) => {
  const inspection = await QualityInspection.findById(inspectionId);
  if (!inspection) {
    const error = new Error('Quality inspection not found');
    error.statusCode = 404;
    throw error;
  }

  if (inspection.status !== QC_STATUS.PENDING) {
    const error = new Error(`Inspection already ${inspection.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  if (!remarks) {
    const error = new Error('Remarks are required for rejection');
    error.statusCode = 400;
    throw error;
  }

  inspection.status = QC_STATUS.REJECTED;
  inspection.inspectedBy = user._id;
  inspection.remarks = remarks;
  await inspection.save();

  // Audit
  await logAction(AUDIT_ACTIONS.QC_REJECTED, user, {
    itemCode: inspection.itemCode,
    quantity: inspection.quantity,
    details: { inspectionId: inspection._id, reason: remarks },
  });

  return inspection;
};

module.exports = {
  approveInspection,
  rejectInspection,
};
