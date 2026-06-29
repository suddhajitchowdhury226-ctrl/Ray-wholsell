const mongoose = require('mongoose');

const counselingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  },
  phone: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    enum: ['St Paul', 'Wayzata', 'North Oaks', 'Lakeville', 'Maple Grove', 'Mendota Heights', 'Eden Prairie', 'Any'],
  },
  helpWith: {
    type: String,
    required: true,
    enum: [
      'I want to schedule a nutrition consultation.',
      'I want to schedule my Nutrition 4 Weight Loss consultation.',
      'I have a question about nutrition consultations.',
      'I have a question about other services.',
      'I have a questions about something else.',
    ],
  },
  contactMethod: {
    type: String,
    required: true,
    enum: ['email', 'phone'],
  },
  bestTime: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon', 'evening'],
  },
  whereDoYouLive: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Counseling', counselingSchema);