const Newsletter = require('../Models/newsletterModel');

exports.createNewsletter = async (req, res) => {
  try {
    const { email, message, type } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const newsletterType = type || (req.originalUrl.includes('/retailer/') ? 'retailer' : 'wholesaler');
    const newsletter = await Newsletter.create({ type: newsletterType, email, message });

    res.status(201).json({
      success: true,
      message: 'Newsletter subscription successful',
      newsletter
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
};

exports.getAllNewsletters = async (req, res) => {
  try {
    const type = req.originalUrl.includes('/retailer/') ? 'retailer' : 'wholesaler';
    const newsletters = await Newsletter.find({ type }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, newsletters });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch newsletters', error: error.message });
  }
};

exports.deleteNewsletter = async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Newsletter deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete newsletter', error: error.message });
  }
};

exports.getAdminNewsletters = async (req, res) => {
  try {
    // Admin needs to see all newsletters (both wholesaler and retailer)
    const newsletters = await Newsletter.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, newsletters });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch newsletters for admin', error: error.message });
  }
};

exports.deleteAdminNewsletter = async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Newsletter deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete newsletter', error: error.message });
  }
};

exports.editAdminNewsletter = async (req, res) => {
  try {
    const { email, message, type } = req.body;
    const newsletter = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { email, message, type },
      { new: true, runValidators: true }
    );

    if (!newsletter) {
      return res.status(404).json({ message: 'Newsletter not found' });
    }

    res.status(200).json({ success: true, message: 'Newsletter updated successfully', newsletter });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update newsletter', error: error.message });
  }
};
