const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a brand name'],
    unique: true,
    trim: true,
    minlength: [2, 'Brand name must be at least 2 characters'],
    maxlength: [50, 'Brand name cannot exceed 50 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);