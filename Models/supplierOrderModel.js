const mongoose = require('mongoose');

const supplierLineItemSchema = new mongoose.Schema({
  productName:        { type: String, required: true, trim: true },
  supplierItemNumber: { type: String, default: '' },
  description:        { type: String, default: '' },
  quantity:           { type: Number, required: true, min: 1 },
  unit:               { type: String, default: 'each' },
  agreedCost:         { type: Number, required: true, min: 0 },
  lineTotal:          { type: Number },
  internalRef:        { type: String, default: '' },
}, { _id: true });

const supplierOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true,
  },
  supplierName:    { type: String, required: true, trim: true },
  supplierContact: { type: String, default: '' },
  supplierEmail:   { type: String, default: '' },
  supplierPhone:   { type: String, default: '' },
  supplierAddress: { type: String, default: '' },

  items: [supplierLineItemSchema],

  subtotal:    { type: Number, default: 0 },
  shippingCost:{ type: Number, default: 0 },
  grandTotal:  { type: Number, default: 0 },

  requiredDeliveryDate: { type: Date },
  shippingMethod:       { type: String, default: '' },
  shippingAccount:      { type: String, default: '' },

  notes:  { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
    default: 'draft'
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // NOTE: retail pricing and internal margins are NEVER stored here.

}, { timestamps: true });

// Auto-generate PO number before first save
supplierOrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.poNumber) {
    const count = await mongoose.model('SupplierOrder').countDocuments();
    const year  = new Date().getFullYear();
    const seq   = String(count + 1).padStart(4, '0');
    this.poNumber = 'PO-' + year + '-' + seq;
  }
  // Recompute item lineTotals and order totals
  this.items.forEach(function(item) {
    item.lineTotal = +(item.quantity * item.agreedCost).toFixed(2);
  });
  this.subtotal   = +this.items.reduce(function(s, i) { return s + (i.quantity * i.agreedCost); }, 0).toFixed(2);
  this.grandTotal = +(this.subtotal + (this.shippingCost || 0)).toFixed(2);
  next();
});

module.exports = mongoose.model('SupplierOrder', supplierOrderSchema);
