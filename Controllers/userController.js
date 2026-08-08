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