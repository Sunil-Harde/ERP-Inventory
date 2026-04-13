const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Item name cannot exceed 200 characters'],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    reservedQty: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
    },
    uom: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      trim: true,
      // e.g., KG, PCS, LTR, MTR, BOX, NOS
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      // e.g., Raw Material, Consumable, Packaging, Chemical
    },
    minStock: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Indexes
itemSchema.index({ itemCode: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ stock: 1 });

// Virtual: check if stock is low
itemSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.minStock;
});

// Virtual: available stock (stock minus reserved)
itemSchema.virtual('availableStock').get(function () {
  return this.stock - (this.reservedQty || 0);
});

// Ensure virtuals are included in JSON
itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema);
