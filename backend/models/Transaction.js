const mongoose = require('mongoose');
const { TXN_TYPE } = require('../utils/constants');

const transactionSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: [TXN_TYPE.IN, TXN_TYPE.OUT],
        message: '{VALUE} is not a valid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0'],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed by user is required'],
    },
    department: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    relatedPO: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    relatedQC: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
    },
  },
  {
    timestamps: true, // acts as the timestamp field
  }
);

// Indexes for efficient querying
transactionSchema.index({ itemCode: 1, createdAt: -1 });
transactionSchema.index({ performedBy: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ department: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
