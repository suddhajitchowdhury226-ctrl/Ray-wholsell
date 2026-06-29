const mongoose = require('mongoose');

const invoiceSettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: "RAY'S HEALTHY LIVING" },
    tagline: { type: String, default: "Health & Wellness Products" },
    email: { type: String, default: "info@rayshealthyliving.com" },
    phone: { type: String, default: "+1 (555) 123-4567" },
    address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        zip: { type: String, default: "" },
        country: { type: String, default: "" }
    },
    headerColor: {
        r: { type: Number, default: 41 },
        g: { type: Number, default: 128 },
        b: { type: Number, default: 185 }
    },
    footerText: { type: String, default: "Thank you for your business!" }
}, { timestamps: true });

module.exports = mongoose.model('InvoiceSettings', invoiceSettingsSchema);
