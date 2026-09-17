const mongoose = require('mongoose');

const subscriptionItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    name: String,
    sku: String,
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    // User & Identification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    subscriptionNumber: {
      type: String,
      unique: true,
      required: true,
      indexed: true,
    },
    websiteRole: {
      type: String,
      enum: ['wholesaler', 'retailer', 'user'],
      required: true,
    },

    // Subscription Items
    items: [subscriptionItemSchema],

    // Pricing & Discounts
    subtotal: {
      type: Number,
      required: true,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },

    // Delivery & Frequency
    frequency: {
      type: String,
      enum: ['7days', '14days', '30days', '60days', '90days'],
      required: true,
      default: '30days',
    },
    deliveryAddress: {
      title: String,
      name: String,
      contact: String,
      fullAddress: String,
      city: String,
      state: String,
      zipCode: String,
      isDefault: Boolean,
    },

    // Shipment & Status
    shippingCost: {
      type: Number,
      default: 0,
    },

    // Subscription Status Workflow
    status: {
      type: String,
      enum: [
        'active',
        'paused',
        'cancelled',
        'pending_activation',
        'expired',
      ],
      default: 'active',
      indexed: true,
    },

    // Billing & Payment
    nextBillingDate: {
      type: Date,
      required: true,
    },
    lastBilledDate: {
      type: Date,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      indexed: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },

    // Lifecycle Management
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    pausedReason: {
      type: String,
      default: null,
    },

    // Subscription Management
    canSkipNext: {
      type: Boolean,
      default: true,
    },
    skippedDeliveries: [
      {
        date: Date,
        reason: String,
      },
    ],
    autoRenew: {
      type: Boolean,
      default: true,
    },
    editableUntil: {
      type: Date,
      default: null, // User can edit subscription up to this date before next delivery
    },

    // Customer Notes & Preferences
    customerNotes: {
      type: String,
      default: null,
    },
    specialInstructions: {
      type: String,
      default: null,
    },

    // Admin Notes
    adminNotes: {
      type: String,
      default: null,
    },

    // Tracking
    totalOrdersGenerated: {
      type: Number,
      default: 0,
    },
    lastOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    // Cancellation Info
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'admin'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique subscription number
subscriptionSchema.pre('save', async function (next) {
  if (!this.subscriptionNumber) {
    const count = await this.constructor.countDocuments();
    this.subscriptionNumber = `SUB-${Date.now()}-${count + 1}`;
  }
  next();
});

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, status: 1 });
subscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
