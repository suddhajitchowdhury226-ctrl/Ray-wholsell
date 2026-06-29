const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product ID is required'],
      },
      quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
      },
      websiteRole: {
        type: String,
        enum: ['retailer', 'wholesaler'],
        required: [true, 'Website role is required'],
      },
      variantId: {
        type: String,
        default: null
      },
      flavour: {
        type: String,
        default: null
      }
    }
  ],
}, { timestamps: true });



module.exports = mongoose.model('Cart', cartSchema);
