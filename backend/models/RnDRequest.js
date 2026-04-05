const mongoose = require('mongoose');
const { RND_STATUS } = require('../utils/constants');

const rndItemSchema = new mongoose.Schema(
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
  },
  { _id: false }
);

const rndRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      required: true,
    },
    items: {
      type: [rndItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one item is required in the R&D request',
      },
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(RND_STATUS),
        message: '{VALUE} is not a valid R&D request status',
      },
      default: RND_STATUS.PENDING,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
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

// Auto-generate request number
rndRequestSchema.pre('validate', async function (next) {
  if (this.isNew && !this.requestNumber) {
    const count = await mongoose.model('RnDRequest').countDocuments();
    this.requestNumber = `RND-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
rndRequestSchema.index({ requestNumber: 1 });
rndRequestSchema.index({ status: 1 });
rndRequestSchema.index({ requestedBy: 1 });
rndRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RnDRequest', rndRequestSchema);
