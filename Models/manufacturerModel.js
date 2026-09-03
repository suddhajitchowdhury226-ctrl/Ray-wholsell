const mongoose = require('mongoose');

const manufacturerSchema = new mongoose.Schema({
  // === Manufacturer Identifier ===
  manufacturerId: {
    type: String,
    enum: ['RHL1', 'RHL2', 'RHL3'],
    unique: true,
    required: true,
    description: 'Unique manufacturer identifier (RHL1, RHL2, RHL3)'
  },
  
  // === Company Information ===
  companyName: {
    type: String,
    required: true,
    description: 'Full company name of the manufacturer'
  },
  
  // === Contact Information ===
  contactPerson: {
    name: String,
    title: String,
    email: String,
    phone: String
  },
  
  technicalContact: {
    name: String,
    title: String,
    email: String,
    phone: String,
    description: 'Technical contact for EDI/API/OrderDog integration'
  },
  
  // === Address ===
  address: {
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  
  // === Ordering Configuration ===
  orderingMethod: {
    type: String,
    enum: ['email', 'phone', 'fax', 'edi', 'api', 'orderdog', 'other'],
    required: true,
    description: 'Primary method for submitting orders to manufacturer'
  },
  
  // === EDI/API Integration ===
  integrationDetails: {
    type: {
      type: String,
      enum: ['edi', 'api', 'orderdog', 'none'],
      description: 'Type of electronic integration if applicable'
    },
    endpoint: {
      type: String,
      description: 'API endpoint or integration URL'
    },
    apiKey: {
      type: String,
      select: false, // Don't include in default queries for security
      description: 'API authentication key (encrypted in production)'
    },
    credentials: {
      username: String,
      password: String, // Should be encrypted in production
      description: 'EDI/OrderDog login credentials'
    },
    documentationUrl: String,
    technicalNotes: String,
    status: {
      type: String,
      enum: ['not_configured', 'configured', 'tested', 'active'],
      default: 'not_configured'
    },
    testedDate: Date,
    lastSuccessfulOrder: Date
  },
  
  // === Minimum Order Quantities ===
  minimumOrderQuantity: {
    type: Number,
    default: 1,
    description: 'Minimum units per order'
  },
  
  // === Lead Times ===
  standardLeadDays: {
    type: Number,
    description: 'Standard delivery lead time in days'
  },
  
  rushOrderAvailable: {
    type: Boolean,
    default: false
  },
  
  rushLeadDays: {
    type: Number,
    description: 'Rush order lead time in days'
  },
  
  // === Product Identifiers ===
  productIdField: {
    type: String,
    enum: ['manufacturerItemNumber', 'sku', 'upc', 'other'],
    description: 'Which field to use as the primary product identifier in orders'
  },
  
  // === Pricing ===
  pricingStructure: {
    type: String,
    enum: ['fixed', 'tiered', 'volume_based', 'quote_required'],
    description: 'How pricing is structured'
  },
  
  acceptsQuantityDiscounts: {
    type: Boolean,
    default: false
  },
  
  // === Product Categories Handled ===
  productCategories: [{
    type: String,
    description: 'Categories of products this manufacturer supplies (e.g., "Liquid Extracts", "Vitamins")'
  }],
  
  // === Communication Preferences ===
  inquiryEmailTemplate: {
    type: String,
    description: 'Standard email template for sending inquiries'
  },
  
  includeDeliveryAddressInInquiry: {
    type: Boolean,
    default: true
  },
  
  // === Status & Activity Tracking ===
  status: {
    type: String,
    enum: ['active', 'inactive', 'testing', 'pending_integration'],
    default: 'active'
  },
  
  lastActivityDate: Date,
  lastOrderDate: Date,
  totalOrdersPlaced: {
    type: Number,
    default: 0
  },
  
  // === Notes ===
  internalNotes: {
    type: String,
    description: 'Staff notes about this manufacturer'
  },
  
  setupNotes: {
    type: String,
    description: 'Notes about how integration was configured'
  },
  
  // === Configuration Status ===
  integrationCompleted: {
    type: Boolean,
    default: false,
    description: 'Whether integration setup is complete and tested'
  },
  
  completedDate: Date,
  completedBy: mongoose.Schema.Types.ObjectId,
  
}, {
  timestamps: true
});

// Index for fast lookups
manufacturerSchema.index({ manufacturerId: 1 });
manufacturerSchema.index({ status: 1 });

module.exports = mongoose.model('Manufacturer', manufacturerSchema);
