const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  category: { type: String, required: true },
  service: { type: String, required: true },
  consultant: { type: String, required: true },
  selectedTime: { type: String, required: true },
  date: { type: Date, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  notes: { type: String },
  paymentMethod: { type: String, required: true },
  paymentStatus: { type: String, default: 'Pending' },
  paymentId: { type: String },
   paypalOrderId: { type: String } // Added to store PayPal order ID
}, { 
  timestamps: true,
  indexes: [
    {
      key: { email: 1, date: 1, selectedTime: 1, consultant: 1, service: 1 },
      unique: true
    }
  ]
});

module.exports = mongoose.model('Booking', bookingSchema);