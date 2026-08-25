const express = require('express');
const { 
  createOrderFromCart, 
  getUserOrders, 
  getOrderDetails,
  getAllOrders,
  updateOrderStatus,
  sendMerchantEnquiry
} = require('../Controllers/orderController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

const router = express.Router();

// User routes (require authentication)
router.post('/checkout', protect, restrictTo('user'), createOrderFromCart);
router.get('/my-orders', protect, restrictTo('user'), getUserOrders);
router.get('/details/:orderId', protect, restrictTo('user'), getOrderDetails);

// Admin routes (require admin role)
router.get('/all-orders', protect, restrictTo('admin'), getAllOrders);
router.patch('/update-status/:orderId', protect, restrictTo('admin'), updateOrderStatus);
router.post('/merchant-enquiry', protect, restrictTo('admin'), sendMerchantEnquiry);

module.exports = router;