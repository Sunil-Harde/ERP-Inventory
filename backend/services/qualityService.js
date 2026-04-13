const QualityInspection = require('../models/QualityInspection');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const RejectedItem = require('../models/RejectedItem');
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

/**
 * Partial approval — split quantity into approved (→ inventory) and rejected (→ RejectedItem).
 * @param {String} inspectionId
 * @param {Object} user - req.user
 * @param {Number} approvedQty
 * @param {Number} rejectedQty
 * @param {String} reason - rejection reason (required if rejectedQty > 0)
 * @param {String} remarks - general remarks
 */
const partialApproveInspection = async (inspectionId, user, approvedQty, rejectedQty, reason = '', remarks = '') => {
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

  // Validate quantities
  const totalQty = inspection.quantity;
  if (approvedQty + rejectedQty !== totalQty) {
    const error = new Error(`Approved (${approvedQty}) + Rejected (${rejectedQty}) must equal Total (${totalQty})`);
    error.statusCode = 400;
    throw error;
  }

  if (approvedQty < 0 || rejectedQty < 0) {
    const error = new Error('Quantities cannot be negative');
    error.statusCode = 400;
    throw error;
  }

  if (rejectedQty > 0 && !reason.trim()) {
    const error = new Error('Rejection reason is required when rejecting items');
    error.statusCode = 400;
    throw error;
  }

  // Determine status
  let newStatus;
  if (approvedQty === totalQty) {
    newStatus = QC_STATUS.APPROVED;
  } else if (rejectedQty === totalQty) {
    newStatus = QC_STATUS.REJECTED;
  } else {
    newStatus = QC_STATUS.PARTIAL_APPROVED;
  }

  // Update inspection
  inspection.status = newStatus;
  inspection.inspectedBy = user._id;
  inspection.approvedQty = approvedQty;
  inspection.rejectedQty = rejectedQty;
  inspection.rejectionReason = reason || undefined;
  inspection.remarks = remarks || `Approved: ${approvedQty}, Rejected: ${rejectedQty}`;
  await inspection.save();

  let item = null;

  // ── Handle approved quantity → Inventory ──
  if (approvedQty > 0) {
    item = await Item.findOne({ itemCode: inspection.itemCode });
    if (!item) {
      item = await Item.create({
        itemCode: inspection.itemCode,
        itemName: inspection.itemName,
        stock: 0,
        uom: inspection.uom || 'NOS',
        category: 'General',
      });
    }

    item.stock += approvedQty;
    await item.save();

    // IN transaction for approved qty
    await Transaction.create({
      itemCode: item.itemCode,
      itemName: item.itemName,
      type: TXN_TYPE.IN,
      quantity: approvedQty,
      performedBy: user._id,
      department: user.department,
      remarks: `QC Partial Approved - ${approvedQty} units accepted`,
      relatedPO: inspection.purchaseOrder,
      relatedQC: inspection._id,
    });
  }

  let rejectedItem = null;

  // ── Handle rejected quantity → RejectedItem collection ──
  if (rejectedQty > 0) {
    rejectedItem = await RejectedItem.create({
      itemCode: inspection.itemCode,
      itemName: inspection.itemName,
      rejectedQty,
      reason,
      uom: inspection.uom,
      checkedBy: user._id,
      qualityInspection: inspection._id,
      purchaseOrder: inspection.purchaseOrder,
    });
  }

  // Audit
  await logAction(AUDIT_ACTIONS.QC_PARTIAL_APPROVED, user, {
    itemCode: inspection.itemCode,
    quantity: totalQty,
    details: {
      inspectionId: inspection._id,
      approvedQty,
      rejectedQty,
      reason,
      newStock: item?.stock,
    },
  });

  return { inspection, item, rejectedItem };
};

module.exports = {
  approveInspection,
  rejectInspection,
  partialApproveInspection,
};

