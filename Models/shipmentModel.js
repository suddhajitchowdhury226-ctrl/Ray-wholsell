const mongoose = require('mongoose');

// const shipmentSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   orderId: {
//     type: String,
//     required: true,
//     unique: true, // Maps to Stripe checkout session ID
//   },
//   address: {
//     title: { type: String, required: true },
//     name: { type: String, required: true },
//     addressLine1: { type: String, required: true },
//     addressLine2: { type: String, default: '' },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     country: { type: String, required: true },
//     zipcode: { type: String, required: true },
//     contactNumber: { type: String, required: true },
//   },
//   cartItems: [
//     {
//       product: {
//         _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//         name: { type: String, required: true },
//         buyPrice: { type: Number, required: true },
//         weight: { type: Number, default: 16 },
//         dimensions: {
//           length: { type: Number, default: 10 },
//           width: { type: Number, default: 5 },
//           height: { type: Number, default: 2 },
//         },
//       },
//       quantity: { type: Number, required: true, min: 1 },
//     },
//   ],
//   shipping: {
//     labelId: { type: String, required: true },
//     trackingNumber: { type: String, required: true },
//     labelDownload: {
//       href: { type: String, required: true },
//       pdf: { type: String },
//     },
//     shippingCost: { type: Number, required: true, min: 0 },
//     serviceCode: { type: String, default: 'usps_priority_mail_express' },
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'shipped', 'delivered', 'cancelled'],
//     default: 'pending',
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model('Shipment', shipmentSchema);



const shipmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String }, // Adjust to allow null if needed
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'], // Adjust enum values
    required: true,
  },
  shipping: {
    labelId: { type: String, required: true },
    trackingNumber: { type: String, required: true },
    shipmentId: { type: String },
    shippingCost: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    insuranceCost: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    labelDownload: {
      href: { type: String, required: true },
      pdf: { type: String },
      png: { type: String },
      zpl: { type: String },
    },
  },
  address: {
    title: { type: String, required: true },
    name: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipcode: { type: String, required: true },
    contactNumber: { type: String, required: true },
  },
  shipFrom: {
    name: { type: String },
    address_line1: { type: String },
    city_locality: { type: String },
    state_province: { type: String },
    postal_code: { type: String },
    country_code: { type: String },
    phone: { type: String },
  },
  productDetails: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      creatorRole: { type: String }
    },
  ],
  createdAt: { type: String },
  trackingUrl: { type: String },
});

module.exports = mongoose.model('Shipment', shipmentSchema);