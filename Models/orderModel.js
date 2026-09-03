const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
  },
  
  // === Order Items ===
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    rhlProductId: {
      type: String,
      required: false,
      description: 'RHL Product ID for reference'
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    websiteRole: {
      type: String,
      enum: ['retailer', 'wholesaler'],
      required: [true, 'Website role is required'],
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    variantName: {
      type: String,
      required: false,
    },
    flavour: {
      type: String,
      required: false,
    },
    manufacturer: {
      type: String,
      enum: ['RHL1', 'RHL2', 'RHL3', 'Internal', 'Other'],
      required: false,
      description: 'Manufacturer for this product (for routing)'
    },
    bin_location: {
      type: String,
      required: false,
      description: 'Warehouse bin location for fulfillment'
    }
  }],
  
  // === Delivery Address ===
  deliveryAddress: {
    title: String,
    name: String,
    contactNumber: String,
    email: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    zipcode: String,
  },
  
  // === Pricing & Totals ===
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total cannot be negative'],
  },
  finalTotal: {
    type: Number,
    required: false,
    description: 'Final total after manufacturer confirmation (may differ from initial total)'
  },
  
  // === Order Status Workflow ===
  status: {
    type: String,
    enum: [
      'draft',
      'requested',
      'order_confirmation_sent',
      'manufacturer_inquiry_sent',
      'manufacturer_confirmed',
      'approved',
      'payment_authorized',
      'payment_captured',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'pending_payment'
    ],
    default: 'draft',
  },
  
  // === Payment Information (Stripe Authorization + Capture) ===
  payment: {
    method: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'other'],
      default: 'stripe'
    },
    stripePaymentIntentId: {
      type: String,
      required: false,
      description: 'Stripe PaymentIntent ID for this order'
    },
    stripeClientSecret: {
      type: String,
      required: false,
      description: 'Stripe client secret for authorization'
    },
    authorizedAmount: {
      type: Number,
      required: false,
      description: 'Initial authorized amount (may be different from final capture)'
    },
    authorizationTimestamp: {
      type: Date,
      required: false,
      description: 'When the card authorization occurred'
    },
    authorizationExpiresAt: {
      type: Date,
      required: false,
      description: 'When the authorization expires (varies by card network)'
    },
    capturedAmount: {
      type: Number,
      required: false,
      description: 'Final amount captured from customer'
    },
    captureTimestamp: {
      type: Date,
      required: false,
      description: 'When the final capture occurred'
    },
    releasedAmount: {
      type: Number,
      required: false,
      description: 'Amount released from the authorization'
    },
    authorizationStatus: {
      type: String,
      enum: ['pending', 'authorized', 'capturing', 'captured', 'failed', 'expired', 'cancelled'],
      default: 'pending'
    },
    stripeChargeId: {
      type: String,
      required: false,
      description: 'Stripe Charge ID after capture'
    },
    paymentError: {
      type: String,
      required: false,
      description: 'Error message if payment fails'
    }
  },
  
  // === Admin Review & Confirmation ===
  confirmedItems: [{
    productId: mongoose.Schema.Types.ObjectId,
    rhlProductId: String,
    name: String,
    quantity: Number,
    price: Number,
    isAvailable: {
      type: Boolean,
      default: true
    },
    originalQuantity: Number,
    manufacturer: String,
    manufacturerConfirmedAt: Date,
    _id: false
  }],
  
  // === Order Notes & Communication ===
  adminNotes: {
    type: String,
    default: '',
  },
  standardNotes: [{
    note: {
      type: String,
      enum: [
        'Product currently unavailable',
        'Product discontinued',
        'Product temporarily out of stock',
        'Expected back in stock shortly',
        'Quantity adjusted based on availability'
      ]
    },
    addedAt: Date,
    addedBy: mongoose.Schema.Types.ObjectId
  }],
  customerNotes: {
    type: String,
    default: '',
    description: 'Notes visible to customer about order status'
  },
  
  // === Shipping ===
  shippingCostSet: {
    amount: Number,
    setBy: mongoose.Schema.Types.ObjectId,
    setAt: Date,
    _id: false
  },
  
  // === Manufacturer Inquiry ===
  manufacturerInquiry: {
    inquiryId: String,
    sentAt: Date,
    sentBy: mongoose.Schema.Types.ObjectId,
    responses: [{
      manufacturer: String,
      receivedAt: Date,
      availability: String,
      confirmedQuantities: [{ productId: String, quantity: Number }],
      pricing: [{ productId: String, price: Number }],
      deliveryTimeline: String,
      minimumOrderQuantity: Number,
      _id: false
    }]
  },
  
  // === Order Lifecycle Tracking ===
  confirmedAt: Date,
  confirmedBy: mongoose.Schema.Types.ObjectId,
  submittedAt: Date,
  couponCode: {
    type: String,
    default: null,
  },
  
  // === User Info ===
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
  },
  websiteRole: {
    type: String,
    enum: ['retailer', 'wholesaler'],
    default: 'wholesaler',
  },
}, {
  timestamps: true,
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
