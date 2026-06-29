const WholesalerForm = require('../Models/wholesalerFormModel');
const User = require('../Models/user');

// Submit wholesaler form
exports.submitWholesalerForm = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Resale certificate file is required' });
    }

    // Validate user exists and is a wholesaler
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'wholesaler') {
      return res.status(400).json({ message: 'User must be a wholesaler to submit this form' });
    }

    // Check if form already exists for this user
    const existingForm = await WholesalerForm.findOne({ userId });
    if (existingForm) {
      return res.status(400).json({ message: 'Wholesaler form already submitted for this user' });
    }

    // Create new wholesaler form
    const wholesalerForm = new WholesalerForm({
      ...req.body,
      userId,
      resaleCertificateFile: req.file.path,
    });

    await wholesalerForm.save();

    res.status(201).json({
      message: 'Wholesaler form submitted successfully',
      formId: wholesalerForm._id,
    });
  } catch (error) {
    console.error('Error submitting wholesaler form:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get wholesaler form by user ID
exports.getWholesalerForm = async (req, res) => {
  try {
    const { userId } = req.params;

    const wholesalerForm = await WholesalerForm.findOne({ userId }).populate('userId', 'name email');
    if (!wholesalerForm) {
      return res.status(404).json({ message: 'Wholesaler form not found' });
    }

    res.status(200).json(wholesalerForm);
  } catch (error) {
    console.error('Error fetching wholesaler form:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all wholesaler forms (admin only)
exports.getAllWholesalerForms = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const wholesalerForms = await WholesalerForm.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WholesalerForm.countDocuments(query);

    res.status(200).json({
      forms: wholesalerForms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error fetching wholesaler forms:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update wholesaler form status (admin only)
exports.updateFormStatus = async (req, res) => {
  try {
    const { formId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const wholesalerForm = await WholesalerForm.findByIdAndUpdate(
      formId,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!wholesalerForm) {
      return res.status(404).json({ message: 'Wholesaler form not found' });
    }

    res.status(200).json({
      message: 'Form status updated successfully',
      form: wholesalerForm,
    });
  } catch (error) {
    console.error('Error updating form status:', error);
    res.status(500).json({ message: error.message });
  }
};