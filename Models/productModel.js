

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // === RHL Product Identifiers ===
  rhlProductId: {
    type: String,
    unique: true,
    sparse: true,
    required: false,
    description: 'Ray\'s Healthy Living unique product identifier (customer-facing)'
  },
  rhlUpc: {
    type: String,
    required: false,
    description: 'Ray\'s Healthy Living / GS1 UPC barcode (customer-facing)'
  },
  
  // === Manufacturer Information ===
  manufacturer: {
    type: String,
    enum: ['RHL1', 'RHL2', 'RHL3', 'Internal', 'Other'],
    required: false,
    description: 'Manufacturer supplier identifier for routing orders'
  },
  manufacturerItemNumber: {
    type: String,
    required: false,
    description: 'Manufacturer\'s item number for ordering (NOT customer-facing)'
  },
  manufacturerUpc: {
    type: String,
    required: false,
    description: 'Original manufacturer UPC (internal use only, NOT customer-facing)'
  },
  
  // === Legacy Fields (kept for backwards compatibility) ===
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
    description: 'Product name - displayed on product page'
  },
  originalProductName: {
    type: String,
    trim: true,
    required: false,
    description: 'Original product name from master list (for reference/search)'
  },
  productDescription: {
    type: String,
    trim: true,
    required: false,
    description: 'Product description/details from Column D (e.g., "Powder Capsules", "Herbal Handbook")'
  },
  rhlProductName: {
    type: String,
    trim: true,
    required: false,
    description: 'New RHL elevated product name (alternative display name)'
  },
  sku: {
    type: String,
  },
  
  // === Pricing ===
  buyPrice: {
    type: Number,
    min: [0, 'Buy price cannot be negative'],
  },
  sellPrice: {
    type: Number,
    min: [0, 'Sell price cannot be negative'],
  },
  wholesaleSellPrice: {
    type: Number,
    min: [0, 'Wholesale price cannot be negative'],
    required: false,
    description: 'Wholesale-specific pricing if different from retail'
  },
  
  // === Inventory ===
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
  },
  reorder: {
    type: Number,
    required: false,
  },
  bin_location: {
    type: String,
    required: false,
    description: 'Internal warehouse bin location for fulfillment'
  },
  
  // === Product Details ===
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category'],
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
  },
  
  // === Product Form (for future filtering) ===
  productForm: {
    type: String,
    enum: ['Liquid', 'Capsule', 'Powder', 'Tablet', 'Tincture', 'Oil', 'Cream', 'Other'],
    required: false,
    description: 'Product form/type for filtering and sorting'
  },
  
  // === Description & Ingredients ===
  description: {
    type: String,
  },
  additional: {
    type: String,
  },
  ingredient: {
    type: String,
    description: 'Product ingredients list'
  },
  disclaimer: {
    type: String,
  },
  
  // === Media ===
  images: [{
    type: String,
    required: false,
  }],
  
  // === Dimensions & Weight ===
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
  
  // === Metadata ===
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  supplierName: {
    type: String,
    required: false,
  },
  
  // === Product Variants ===
  variants: [{
    variantName: { type: String },
    sku: { type: String },
    rhlProductId: { type: String, description: 'RHL ID for this variant' },
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