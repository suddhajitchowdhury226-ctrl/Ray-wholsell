const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'wholesaler'
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Newsletter', newsletterSchema);
