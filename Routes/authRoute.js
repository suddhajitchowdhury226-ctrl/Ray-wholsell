const express = require('express');
const { registerUser, registerAdmin, loginUser, getCurrentUser,
  updateUser, addAddress, updateAddress, getAddresses, deleteAddress, addToWishlist, removeFromWishlist, getWishlist, addOrUpdateReview, getProductReviews, getUserReviews, getWholesalersAndRetailers, updateUserCommission, getUserCommission, getAllShipments, getAllUsers, sendEmail, getAdminProfile, updateAdminProfile, getWholesalerProfile, updateWholesalerProfile, getRetailerProfile, updateRetailerProfile, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword, verifyEmailOTP, resendVerificationOTP, createAdmin, getAllAdmins, deleteAdmin, updateAdminPassword } = require('../Controllers/authController');
const authRouter = express.Router();
const { protect, restrictTo } = require("../Middleware/tokenVerify");
const { uploadProfile } = require('../multerConfig/multerConfig');


authRouter.post('/register', registerUser); // Wholesaler/Retailer signup
authRouter.post('/verify-email-otp', verifyEmailOTP); // Verify Email
authRouter.post('/resend-verification-otp', resendVerificationOTP); // Resend OTP

authRouter.post('/admin/register', registerAdmin); // Admin signup

authRouter.post('/login', loginUser); // Admin/Wholesaler/Retailer login

// Password Reset Routes
authRouter.post('/forgot-password', sendPasswordResetOTP);
authRouter.post('/verify-otp', verifyPasswordResetOTP);
authRouter.post('/reset-password', resetPassword);

// ✅ Get all wholesalers and retailers
authRouter.get('/wholesalers-retailers', getWholesalersAndRetailers);
authRouter.get('/all-users', getAllUsers);
authRouter.post('/commission', updateUserCommission);
authRouter.post('/send-email', sendEmail); // 
authRouter.get('/admin/profile', protect, restrictTo('admin'), getAdminProfile);
authRouter.put('/admin/profile', protect, restrictTo('admin'), updateAdminProfile);

authRouter.get('/wholesaler/profile', protect, restrictTo('wholesaler'), getWholesalerProfile);


authRouter.put('/wholesaler/profile', protect, restrictTo('wholesaler'), uploadProfile.single('profileImage'), updateWholesalerProfile);

authRouter.get(
  "/retailer/profile",
  protect,
  restrictTo("retailer"),
  getRetailerProfile
);

authRouter.put(
  "/retailer/profile",
  protect,
  restrictTo("retailer"), uploadProfile.single('profileImage'),
  updateRetailerProfile
);

// New route for getting user commission
authRouter.get('/commission/:userId', getUserCommission);

authRouter.get('/me', protect, getCurrentUser);
authRouter.put('/update', protect, uploadProfile.single('profileImage'), updateUser);
authRouter.get('/all-shipments', getAllShipments);

authRouter.post('/add-address', protect, addAddress);
authRouter.put('/update-address/:addressId', protect, updateAddress);
authRouter.get('/get-addresses', protect, getAddresses);
authRouter.delete('/delete-address/:addressId', protect, deleteAddress);

// Wishlist routes
authRouter.post('/wishlist', protect, addToWishlist);
authRouter.delete('/wishlist/:productId', protect, removeFromWishlist);
authRouter.get('/wishlist', protect,
  restrictTo("user"), getWishlist);

// ============================================================
// Admin Management Routes (Protected — admin only)
// ============================================================
authRouter.post('/admin/create-admin', protect, restrictTo('admin'), createAdmin);
authRouter.get('/admin/all-admins', protect, restrictTo('admin'), getAllAdmins);
authRouter.delete('/admin/delete-admin/:id', protect, restrictTo('admin'), deleteAdmin);
authRouter.put('/admin/update-password', protect, restrictTo('admin'), updateAdminPassword);

module.exports = authRouter;