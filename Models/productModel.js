
const mongoose = require('mongoose');

// === Variant Schema (for size-specific data) ===
const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    description: 'Size/format: "1 oz", "90 vcp", "2 oz", etc.'
  },
  itemNumber: {
    type: String,
    required: true,
    unique: true,
    description: 'Internal item number (used for ordering and cross-reference)'
  },
  rhlUpc: {
    type: String,
    default: null,
    description: 'Our (RHL) UPC barcode for this variant'
  },
  manufacturerUpc: {
    type: String,
    default: null,
    description: 'Manufacturer original UPC barcode for this variant'
  },
  price: {
    type: Number,
    default: null,
    description: 'Wholesale price in USD for this variant'
  },
  binLocation: {
    type: String,
    default: null,
    description: 'Warehouse bin location for this specific variant (e.g., "6/4 >*", "15/3 >*")'
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'discontinued'],
    description: 'Availability status of this variant'
  }
}, { _id: true });

// === Main Product Schema ===
const productSchema = new mongoose.Schema({
  // === NEW: Core Product Identifiers ===
  rhlId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    description: 'Ray\'s Healthy Living unique product ID (authoritative identifier)'
  },
  
  // === NEW: Category & Classification ===
  department: {
    type: String,
    default: null,
    index: true,
    description: 'Product department (e.g., "VITAMINS A - Z", "JOINT SUPPORT")'
  },
  category: {
    type: String,
    required: true,
    index: true,
    description: 'Product category (e.g., "FRESH GROUND VEGGIE CAPSULES")'
  },
  type: {
    type: String,
    default: null,
    description: 'Product sub-type or format (e.g., "Capsules- Fresh Ground")'
  },
  
  // === Product Names ===
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Manufacturer PRODUCT NAME (internal/authoritative identifier)'
  },
  rhlProductTitle: {
    type: String,
    default: null,
    trim: true,
    description: 'RHL Marketing Title — shown as the product title on the website'
  },
  manufacturerName: {
    type: String,
    default: null,
    description: 'Original manufacturer product name'
  },
  
  // === NEW: Description & Ingredients ===
  description: {
    type: String,
    default: null,
    description: 'Short marketing description'
  },
  ingredients: {
    type: String,
    default: null,
    description: 'Full ingredient list (plain text)'
  },
  
  // === NEW: Variants (size-specific data) ===
  variants: [variantSchema],
  
  // === NEW: Product Images ===
  images: {
    type: [{
      url: {
        type: String,
        required: true,
        description: 'Full CDN/S3 URL to image'
      },
      key: {
        type: String,
        required: true,
        description: 'Storage key (S3 key or filename) for deletion'
      },
      altText: {
        type: String,
        default: '',
        description: 'Alt text for accessibility and SEO'
      },
      isPrimary: {
        type: Boolean,
        default: false,
        description: 'Only ONE image per product should be true (primary/featured image)'
      },
      order: {
        type: Number,
        default: 0,
        description: 'Display order (0 = first, increments per image)'
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
        description: 'Timestamp when image was uploaded'
      }
    }],
    default: [],
    description: 'Product images array with metadata'
  },
  
  // === NEW: Bin Location ===
  bin_location: {
    type: String,
    default: null,
    description: 'Warehouse bin location for fulfillment (e.g., "A-1-1")'
  },
  
  // === Pricing ===
  wholesalePrice: {
    type: Number,
    min: [0, 'Wholesale price cannot be negative'],
    default: 0,
    description: 'Wholesale price for wholesalers'
  },
  retailPrice: {
    type: Number,
    min: [0, 'Retail price cannot be negative'],
    default: 0,
    description: 'Suggested retail price for retailers'
  },
  
  // === Status ===
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'discontinued'],
    description: 'Overall product status'
  },
  
  // === LEGACY FIELDS (kept for backwards compatibility with existing code) ===
  rhlProductId: {
    type: String,
    sparse: true,
    description: '[LEGACY] Old RHL identifier'
  },
  item_number: {
    type: String,
    description: '[LEGACY] Old item number'
  },
  sku: {
    type: String,
    description: '[LEGACY] Old SKU field'
  },
  buyPrice: {
    type: Number,
    min: [0, 'Buy price cannot be negative'],
    description: '[LEGACY] Old buy price'
  },
  sellPrice: {
    type: Number,
    min: [0, 'Sell price cannot be negative'],
    description: '[LEGACY] Old sell price'
  },
  wholesaleSellPrice: {
    type: Number,
    min: [0, 'Wholesale price cannot be negative'],
    description: '[LEGACY] Old wholesale price'
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
    description: '[LEGACY] Old stock field'
  },
  categoryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    description: '[LEGACY] Old category reference'
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    description: '[LEGACY] Old subcategory reference'
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    description: '[LEGACY] Old brand reference'
  },
  legacyImages: [{
    type: String,
    description: '[LEGACY] Old images array'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: '[LEGACY] Creator reference'
  },
  
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);