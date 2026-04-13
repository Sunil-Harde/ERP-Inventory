const mongoose = require('mongoose');

const rejectedItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    rejectedQty: {
      type: Number,
      required: [true, 'Rejected quantity is required'],
      min: [0.01, 'Rejected quantity must be greater than 0'],
    },
    reason: {
      type: String,
      required: [true, 'Rejection reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    uom: {
      type: String,
      trim: true,
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Checked by user is required'],
    },
    qualityInspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
  },
  {
    timestamps: true, // createdAt acts as the "date" field
  }
);

// Indexes
rejectedItemSchema.index({ itemCode: 1, createdAt: -1 });
rejectedItemSchema.index({ checkedBy: 1 });
rejectedItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RejectedItem', rejectedItemSchema);
