const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  title: String, // e.g., Home, Work
  name: String,
  contactNumber: String,
  email: String,
  addressLine1: String,
  addressLine2: String,
  state: String,
  country: String,
    city: {
    type: String,
    required: [true, 'Please provide a city'],
    trim: true,
    
  },
  zipcode: String,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number'],
  },
  profileImage: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['admin', 'wholesaler', 'retailer', 'user'],
    required: [true, 'Please specify a role'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  commission: {
  type: Number,
  default: 0, // or any default percentage or amount you want
},

  addresses: [addressSchema],
    wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // Password reset OTP fields
  resetOTP: {
    type: String,
    default: null,
  },
  resetOTPExpires: {
    type: Date,
    default: null,
  },
  
  // Email Verification Fields
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationOTP: {
    type: String,
    default: null,
  },
  verificationOTPExpires: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

