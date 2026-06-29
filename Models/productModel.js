

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  item_number: {
    type: String,
    required: false,
  },
  lookup_code: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
   
  },
  buyPrice: {
    type: Number,
    min: [0, 'Buy price cannot be negative'],
  },
  sellPrice: {
    type: Number,
    min: [0, 'Sell price cannot be negative'],
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category'],
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    // required: [true, 'Please select a subcategory'],
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    // required: [true, 'Please select a brand'],
  },
  images: [{
    type: String,
    required: false,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
  },
  additional: {
    type: String,
  },
  ingredient: {
    type: String,
  },
  disclaimer: {
    type: String,
  },
  bin_location: {
    type: String,
    required: false,
  },
  length: {
    type: Number,
    required: false,
  },
  width: {
    type: Number,
    required: false,
  },
  height: {
    type: Number,
    required: false,
  },
  weight: {
    type: Number,
    required: false,
  },
  reorder: {
    type: Number,
    required: false,
    
  },
  supplierName: {
    type: String,
    required: false,
  },
  variants: [{
    variantName: { type: String },
    sku: { type: String },
    bin_location: { type: String },
    price: { type: Number },
    stock: { type: Number },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },
    weight: {
      value: Number,
      unit: { type: String, default: 'kg' }
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);