const Newsletter = require('../Models/newsletterModel');

// ── Subscribe ─────────────────────────────────────────────────────────────────
exports.createNewsletter = async (req, res) => {
  try {
    const { email, message, type } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const newsletterType = type || (req.originalUrl.includes('/retailer/') ? 'retailer' : 'wholesaler');

    // Upsert: if email exists for this type just mark re-subscribed
    let newsletter = await Newsletter.findOne({ email: email.toLowerCase(), type: newsletterType });
    if (newsletter) {
      newsletter.isUnsubscribed = false;
      newsletter.doNotEmail    = false;
      newsletter.unsubscribedAt = null;
      newsletter.unsubscribeReason = '';
      newsletter.message = message || newsletter.message;
      await newsletter.save();
      return res.status(200).json({ success: true, message: 'Re-subscribed successfully', newsletter });
    }

    newsletter = await Newsletter.create({ type: newsletterType, email, message });
    res.status(201).json({ success: true, message: 'Newsletter subscription successful', newsletter });
  } catch (error) {
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
};

// ── Unsubscribe ───────────────────────────────────────────────────────────────
exports.unsubscribeNewsletter = async (req, res) => {
  try {
    const { email, reason, doNotEmail } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const newsletterType = req.originalUrl.includes('/retailer/') ? 'retailer' : 'wholesaler';

    // Find existing subscription or create a record to honour the opt-out
    let newsletter = await Newsletter.findOne({ email: email.toLowerCase(), type: newsletterType });
    if (!newsletter) {
      newsletter = await Newsletter.create({
        type: newsletterType,
        email,
        isUnsubscribed: true,
        doNotEmail: doNotEmail === true,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || 'Unsubscribed via frontend'
      });
      return res.status(200).json({ success: true, message: 'Unsubscribe request recorded', newsletter });
    }

    newsletter.isUnsubscribed    = true;
    newsletter.doNotEmail        = doNotEmail === true ? true : newsletter.doNotEmail;
    newsletter.unsubscribedAt    = new Date();
    newsletter.unsubscribeReason = reason || 'Unsubscribed';
    await newsletter.save();

    res.status(200).json({ success: true, message: 'Unsubscribed successfully', newsletter });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
  }
};

// ── Do-Not-Email flag (admin) ─────────────────────────────────────────────────
exports.setDoNotEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { doNotEmail } = req.body;

    const newsletter = await Newsletter.findByIdAndUpdate(
      id,
      { doNotEmail: !!doNotEmail },
      { new: true }
    );
    if (!newsletter) return res.status(404).json({ message: 'Subscription not found' });

    res.status(200).json({ success: true, newsletter });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update', error: error.message });
  }
};

// ── Get all (wholesaler / retailer scoped) ────────────────────────────────────
exports.getAllNewsletters = async (req, res) => {
  try {
    const type = req.originalUrl.includes('/retailer/') ? 'retailer' : 'wholesaler';
    const newsletters = await Newsletter.find({ type }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, newsletters });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch newsletters', error: error.message });
  }
};

// ── Delete ─────────────────────────────────────────────────────────────────────
exports.deleteNewsletter = async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Newsletter deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete newsletter', error: error.message });
  }
};

// ── Admin: get all (both types) ───────────────────────────────────────────────
exports.getAdminNewsletters = async (req, res) => {
  try {
    const { status } = req.query; // status = 'subscribed' | 'unsubscribed' | 'doNotEmail'
    let query = {};
    if (status === 'unsubscribed') query.isUnsubscribed = true;
    else if (status === 'subscribed') query.isUnsubscribed = false;
    else if (status === 'doNotEmail') query.doNotEmail = true;

    const newsletters = await Newsletter.find(query).sort({ createdAt: -1 });
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
    const { email, message, type, isUnsubscribed, doNotEmail, unsubscribeReason } = req.body;
    const update = { email, message, type };
    if (isUnsubscribed !== undefined) update.isUnsubscribed = isUnsubscribed;
    if (doNotEmail     !== undefined) update.doNotEmail     = doNotEmail;
    if (unsubscribeReason)            update.unsubscribeReason = unsubscribeReason;

    const newsletter = await Newsletter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!newsletter) return res.status(404).json({ message: 'Newsletter not found' });

    res.status(200).json({ success: true, message: 'Newsletter updated successfully', newsletter });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update newsletter', error: error.message });
  }
};
