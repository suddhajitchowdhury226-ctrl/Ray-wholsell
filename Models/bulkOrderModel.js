// models/BulkOrder.js
const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  bulkOrderNumber: {
    type: Number,
    required: [true, 'Bulk order number is required'],
    min: [1, 'Bulk order number must be a positive integer'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


module.exports = mongoose.model('BulkOrder', bulkOrderSchema);