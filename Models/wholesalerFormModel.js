const mongoose = require('mongoose');

const wholesalerFormSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  legalName: {
    type: String,
    required: true,
  },
  contactPersonFirstName: {
    type: String,
    required: true,
  },
  contactPersonLastName: {
    type: String,
    required: true,
  },
  titlePosition: {
    type: String,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
  businessType: {
    type: String,
    required: true,
  },
  otherBusinessType: {
    type: String,
  },
  taxExemptStatus: {
    type: String,
    required: true,
  },
  yearsInBusiness: {
    type: Number,
    required: true,
  },
  monthlyPurchaseVolume: {
    type: String,
    required: true,
  },
  federalEIN: {
    type: String,
    required: true,
  },
  resaleCertificateNumber: {
    type: String,
    required: true,
  },
  resaleCertificateFile: {
    type: String,
    required: true,
  },
  sellsSupplements: {
    type: String,
    required: true,
  },
  complyWithLaws: {
    type: String,
    required: true,
  },
  sellsOnThirdParty: {
    type: String,
    required: true,
  },
  thirdPartyPlatforms: {
    type: String,
  },
  preferredPaymentMethod: {
    type: String,
    required: true,
  },
  otherPaymentMethod: {
    type: String,
  },
  preferredShippingMethod: {
    type: String,
    required: true,
  },
  otherShippingMethod: {
    type: String,
  },
  hasLoadingDock: {
    type: String,
    required: true,
  },
  autoShipEnrollment: {
    type: String,
    required: true,
  },
  orderItemCount: {
    type: Number,
    required: true,
  },
  minOrderAgreement: {
    type: Boolean,
    required: true,
  },
  agreementConfirmed: {
    type: Boolean,
    required: true,
  },
  agreementTimestamp: {
    type: Date,
  },
  signature: {
    type: String,
    required: true,
  },
  signatureDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('WholesalerForm', wholesalerFormSchema);