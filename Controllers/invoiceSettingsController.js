const InvoiceSettings = require('../Models/invoiceSettingsModel');

// Get invoice settings (any authenticated user)
const getInvoiceSettings = async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = await InvoiceSettings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching invoice settings:', error);
        res.status(500).json({ message: 'Failed to fetch invoice settings', error: error.message });
    }
};

// Update invoice settings (admin only)
const updateInvoiceSettings = async (req, res) => {
    try {
        const {
            companyName,
            tagline,
            email,
            phone,
            address,
            headerColor,
            footerText
        } = req.body;

        const updateData = {};
        if (companyName !== undefined) updateData.companyName = companyName;
        if (tagline !== undefined) updateData.tagline = tagline;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (headerColor !== undefined) updateData.headerColor = headerColor;
        if (footerText !== undefined) updateData.footerText = footerText;

        const settings = await InvoiceSettings.findOneAndUpdate(
            {},
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ message: 'Invoice settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating invoice settings:', error);
        res.status(500).json({ message: 'Failed to update invoice settings', error: error.message });
    }
};

module.exports = { getInvoiceSettings, updateInvoiceSettings };
