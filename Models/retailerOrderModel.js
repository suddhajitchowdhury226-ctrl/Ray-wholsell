const mongoose = require('mongoose');

const retailerOrderSchema = new mongoose.Schema(
  {
    retailer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        variantLabel: String,
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        priceAtOrder: {
          type: Number,
          required: true
        }
      }
    ],
    subtotal: {
      type: Number,
      required: true
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'USA' }
    },
    adminNotes: {
      type: String,
      default: ''
    },
    confirmedAt: Date,
    paidAt: Date,
    paymentIntentId: String,
    invoiceUrl: String
  },
  {
    timestamps: true
  }
);

// Generate order number before saving
retailerOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('RetailerOrder').countDocuments();
    this.orderNumber = `RET-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const RetailerOrder = mongoose.model('RetailerOrder', retailerOrderSchema);

module.exports = RetailerOrder;
