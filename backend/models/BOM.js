const mongoose = require('mongoose');
const { BOM_STATUS } = require('../utils/constants');

const bomItemSchema = new mongoose.Schema(
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
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    uom: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const bomSchema = new mongoose.Schema(
  {
    bomNumber: {
      type: String,
      unique: true,
      required: true,
    },
    producedItem: {
      type: bomItemSchema,
      required: [true, 'Produced item is required'],
    },
    consumedItems: {
      type: [bomItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one consumed item is required',
      },
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BOM_STATUS),
        message: '{VALUE} is not a valid BOM status',
      },
      default: BOM_STATUS.CREATED,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    warehouseFrom: {
      type: String,
      default: 'SHOP1',
      trim: true,
    },
    warehouseTo: {
      type: String,
      default: 'SHOP2',
      trim: true,
    },
    reserved: {
      type: Boolean,
      default: false,
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

// Auto-generate BOM number
bomSchema.pre('validate', async function (next) {
  if (this.isNew && !this.bomNumber) {
    const count = await mongoose.model('BOM').countDocuments();
    this.bomNumber = `BOM-${String(count + 1).padStart(6, '0')}`;
  }
  // Calculate total cost
  if (this.consumedItems && this.consumedItems.length > 0) {
    this.totalCost = this.consumedItems.reduce((sum, item) => {
      return sum + (item.quantity * (item.price || 0));
    }, 0);
  }
  next();
});

// Indexes
bomSchema.index({ status: 1 });
bomSchema.index({ createdBy: 1 });
bomSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BOM', bomSchema);
