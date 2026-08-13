const User = require('../Models/user');
const WholesalerForm = require('../Models/wholesalerFormModel');

// Get all users with their wholesaler form data
exports.getUsersWithForms = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    const usersWithForms = await Promise.all(
      users.map(async (user) => {
        const wholesalerForm = await WholesalerForm.findOne({ userId: user._id });
        
        return {
          ...user.toObject(),
          wholesalerForm: wholesalerForm || null,
          hasForm: !!wholesalerForm,
          hasCertificate: wholesalerForm?.resaleCertificateFile ? true : false
        };
      })
    );

    res.status(200).json({
      success: true,
      users: usersWithForms
    });
  } catch (error) {
    console.error('Error fetching users with forms:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    await WholesalerForm.deleteOne({ userId: id });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: create a new user account ──────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, phone, password, role, businessName, address } = req.body;

    if (!name || !email || !phone || !password || !role)
      return res.status(400).json({ message: 'name, email, phone, password, and role are required' });

    const allowedRoles = ['user', 'wholesaler', 'retailer'];
    if (!allowedRoles.includes(role))
      return res.status(400).json({ message: 'Role must be user, wholesaler, or retailer' });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(409).json({ message: 'A user with that email or phone already exists' });

    const hashed = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashed,
      role,
      isVerified: true,   // admin-created accounts are pre-verified
      ...(businessName && { businessName }),
      ...(address       && { addresses: [address] })
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, message: 'User created successfully', user: userObj });
  } catch (error) {
    console.error('[createUser]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: approve or reject a wholesale account ───────────────────────────────
exports.updateWholesalerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;   // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ message: 'action must be approve or reject' });

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Update the wholesaler form status if one exists
    const form = await WholesalerForm.findOne({ userId: id });
    if (form) {
      form.status = action === 'approve' ? 'approved' : 'rejected';
      await form.save();
    }

    // Optionally downgrade role if rejected
    if (action === 'reject' && targetUser.role === 'wholesaler') {
      targetUser.role = 'user';
      await targetUser.save();
    }

    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Wholesale account approved' : 'Wholesale account rejected',
      userId: id,
      formStatus: form ? form.status : null
    });
  } catch (error) {
    console.error('[updateWholesalerApproval]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin: update user details ─────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'email', 'phone', 'role'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
