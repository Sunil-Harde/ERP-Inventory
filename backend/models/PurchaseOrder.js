const mongoose = require('mongoose');
const { PO_STATUS } = require('../utils/constants');

const poItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
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
      required: true,
      min: [0.01, 'Quantity must be greater than 0'],
    },
    uom: {
      type: String,
      required: true,
      trim: true,
    },
    receivedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
      required: true,
    },
    supplier: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    items: {
      type: [poItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one item is required in the purchase order',
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PO_STATUS),
        message: '{VALUE} is not a valid PO status',
      },
      default: PO_STATUS.ORDERED,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate PO number before saving
purchaseOrderSchema.pre('validate', async function (next) {
  if (this.isNew && !this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ createdBy: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
