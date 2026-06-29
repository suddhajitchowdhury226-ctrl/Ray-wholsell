const express = require('express');
const { registerUser, registerAdmin, loginUser ,getCurrentUser,
  updateUser, addAddress, updateAddress, getAddresses, deleteAddress, addToWishlist, removeFromWishlist, getWishlist, addOrUpdateReview, getProductReviews, getUserReviews, getWholesalersAndRetailers ,updateUserCommission, getUserCommission,getAllShipments,getAllUsers,sendEmail,getAdminProfile,updateAdminProfile,getWholesalerProfile,updateWholesalerProfile,getRetailerProfile, updateRetailerProfile, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword, verifyEmailOTP, resendVerificationOTP } = require('../Controllers/authController');
const authRouter = express.Router();
const { protect, restrictTo } = require("../Middleware/tokenVerify");
const { uploadProfile } = require('../multerConfig/multerConfig');
const rateLimit = require('express-rate-limit');
const { blacklistToken } = require('../utils/tokenBlacklist');
const logger = require('../utils/logger');

// Rate limiter for send-email endpoint (max 10 requests per 15 minutes per IP)
const sendEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many email requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post('/register', registerUser); // Wholesaler/Retailer signup
authRouter.post('/verify-email-otp', verifyEmailOTP); // Verify Email
authRouter.post('/resend-verification-otp', resendVerificationOTP); // Resend OTP

// Admin signup — protected by secret key check in controller
authRouter.post('/admin/register', registerAdmin);

authRouter.post('/login', loginUser); // Admin/Wholesaler/Retailer login

// Logout — blacklists the current JWT so it cannot be reused
authRouter.post('/logout', protect, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await blacklistToken(token);
    }
    logger.info('Auth: user logged out', { path: req.path });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Auth: logout error', { message: err.message });
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Password Reset Routes
authRouter.post('/forgot-password', sendPasswordResetOTP);
authRouter.post('/verify-otp', verifyPasswordResetOTP);
authRouter.post('/reset-password', resetPassword);

// Admin-only endpoints
authRouter.get('/wholesalers-retailers', protect, restrictTo('admin'), getWholesalersAndRetailers);
authRouter.get('/all-users', protect, restrictTo('admin'), getAllUsers);
authRouter.post('/commission', protect, restrictTo('admin'), updateUserCommission);
authRouter.post('/send-email', protect, sendEmailLimiter, sendEmail);
authRouter.get('/admin/profile', protect, restrictTo('admin'), getAdminProfile);
authRouter.put('/admin/profile', protect, restrictTo('admin'), updateAdminProfile);
authRouter.get('/all-shipments', protect, restrictTo('admin'), getAllShipments);

authRouter.get('/wholesaler/profile', protect, restrictTo('wholesaler'), getWholesalerProfile);


authRouter.put('/wholesaler/profile', protect, restrictTo('wholesaler'), uploadProfile.single('profileImage'),updateWholesalerProfile);

authRouter.get(
  "/retailer/profile",
  protect,
  restrictTo("retailer"),
  getRetailerProfile
);

authRouter.put(
  "/retailer/profile",
  protect,
  restrictTo("retailer"),uploadProfile.single('profileImage'),
  updateRetailerProfile
);

// New route for getting user commission
authRouter.get('/commission/:userId', getUserCommission);

authRouter.get('/me', protect, getCurrentUser);
authRouter.put('/update', protect, uploadProfile.single('profileImage'), updateUser);

authRouter.post('/add-address', protect, addAddress);
authRouter.put('/update-address/:addressId', protect, updateAddress);
authRouter.get('/get-addresses', protect, getAddresses);
authRouter.delete('/delete-address/:addressId', protect, deleteAddress);

// Wishlist routes
authRouter.post('/wishlist', protect, addToWishlist);
authRouter.delete('/wishlist/:productId', protect, removeFromWishlist);
authRouter.get('/wishlist',  protect,
  restrictTo("user"),  getWishlist);


module.exports = authRouter;