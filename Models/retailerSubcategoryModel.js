const mongoose = require('mongoose');

const retailerSubcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a subcategory name'],
    trim: true,
    minlength: [2, 'Subcategory name must be at least 2 characters'],
    maxlength: [50, 'Subcategory name cannot exceed 50 characters'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RetailerCategory',
    required: [true, 'Please provide a retailer category for the subcategory'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('RetailerSubcategory', retailerSubcategorySchema);
