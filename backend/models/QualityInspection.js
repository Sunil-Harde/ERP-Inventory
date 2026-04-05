const mongoose = require('mongoose');
const { QC_STATUS } = require('../utils/constants');

const qualityInspectionSchema = new mongoose.Schema(
  {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase order reference is required'],
    },
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0'],
    },
    uom: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(QC_STATUS),
        message: '{VALUE} is not a valid QC status',
      },
      default: QC_STATUS.PENDING,
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
qualityInspectionSchema.index({ status: 1 });
qualityInspectionSchema.index({ purchaseOrder: 1 });
qualityInspectionSchema.index({ itemCode: 1 });
qualityInspectionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QualityInspection', qualityInspectionSchema);
