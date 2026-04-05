const RnDRequest = require('../models/RnDRequest');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { RND_STATUS, TXN_TYPE, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction } = require('./auditService');

/**
 * Create a new R&D material request.
 */
const createRequest = async (data, user) => {
  const request = await RnDRequest.create({
    items: data.items,
    purpose: data.purpose,
    requestedBy: user._id,
  });

  await logAction(AUDIT_ACTIONS.RND_REQUEST_CREATED, user, {
    details: { requestNumber: request.requestNumber, itemCount: request.items.length },
  });

  return request;
};

/**
 * Approve an R&D request.
 */
const approveRequest = async (requestId, user, remarks = '') => {
  const request = await RnDRequest.findById(requestId);
  if (!request) {
    const error = new Error('R&D request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== RND_STATUS.PENDING) {
    const error = new Error(`Request already ${request.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  request.status = RND_STATUS.APPROVED;
  request.approvedBy = user._id;
  request.remarks = remarks;
  await request.save();

  await logAction(AUDIT_ACTIONS.RND_REQUEST_APPROVED, user, {
    details: { requestNumber: request.requestNumber },
  });

  return request;
};

/**
 * Reject an R&D request.
 */
const rejectRequest = async (requestId, user, remarks) => {
  const request = await RnDRequest.findById(requestId);
  if (!request) {
    const error = new Error('R&D request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== RND_STATUS.PENDING) {
    const error = new Error(`Request already ${request.status.toLowerCase()}`);
    error.statusCode = 400;
    throw error;
  }

  if (!remarks) {
    const error = new Error('Remarks are required for rejection');
    error.statusCode = 400;
    throw error;
  }

  request.status = RND_STATUS.REJECTED;
  request.approvedBy = user._id;
  request.remarks = remarks;
  await request.save();

  await logAction(AUDIT_ACTIONS.RND_REQUEST_REJECTED, user, {
    details: { requestNumber: request.requestNumber, reason: remarks },
  });

  return request;
};

/**
 * Issue materials for an approved R&D request — creates OUT transactions.
 */
const issueMaterials = async (requestId, user) => {
  const request = await RnDRequest.findById(requestId);
  if (!request) {
    const error = new Error('R&D request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== RND_STATUS.APPROVED) {
    const error = new Error('Can only issue materials for approved requests');
    error.statusCode = 400;
    throw error;
  }

  const transactions = [];
  const updatedItems = [];

  for (const reqItem of request.items) {
    const item = await Item.findOne({ itemCode: reqItem.itemCode });
    if (!item) {
      const error = new Error(`Item not found: ${reqItem.itemCode}`);
      error.statusCode = 404;
      throw error;
    }

    if (item.stock < reqItem.quantity) {
      const error = new Error(
        `Insufficient stock for ${reqItem.itemCode}. Available: ${item.stock}, Required: ${reqItem.quantity}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Decrease stock
    item.stock -= reqItem.quantity;
    await item.save();
    updatedItems.push(item);

    // Create OUT transaction
    const txn = await Transaction.create({
      itemCode: item.itemCode,
      itemName: item.itemName,
      type: TXN_TYPE.OUT,
      quantity: reqItem.quantity,
      performedBy: user._id,
      department: 'rnd',
      remarks: `R&D Issue - ${request.requestNumber} - ${request.purpose}`,
    });
    transactions.push(txn);
  }

  // Update request status
  request.status = RND_STATUS.ISSUED;
  await request.save();

  await logAction(AUDIT_ACTIONS.RND_MATERIAL_ISSUED, user, {
    details: {
      requestNumber: request.requestNumber,
      itemsIssued: request.items.length,
    },
  });

  return { request, transactions, updatedItems };
};

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest,
  issueMaterials,
};
