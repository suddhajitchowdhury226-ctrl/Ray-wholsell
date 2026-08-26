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
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
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
  }],
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
  status: {
    type: String,
    enum: ['pending_review', 'confirmed', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending_review',
  },
  couponCode: {
    type: String,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
  },
  websiteRole: {
    type: String,
    enum: ['retailer', 'wholesaler'],
    default: 'wholesaler',
  },
  // Track admin confirmation details
  confirmedItems: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    quantity: Number,           // confirmed/available quantity
    price: Number,
    isAvailable: {
      type: Boolean,
      default: true
    },
    originalQuantity: Number,   // quantity originally requested
    _id: false
  }],
  adminNotes: {
    type: String,
    default: '',
  },
  shippingCostSet: {
    amount: Number,
    setBy: mongoose.Schema.Types.ObjectId,  // admin ID
    setAt: Date,
    _id: false
  },
  confirmedAt: Date,            // when admin confirmed the order
  confirmedBy: mongoose.Schema.Types.ObjectId,  // admin ID
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