const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'wholesaler'
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    default: ''
  },
  // Unsubscribe / compliance fields
  isUnsubscribed: {
    type: Boolean,
    default: false
  },
  doNo