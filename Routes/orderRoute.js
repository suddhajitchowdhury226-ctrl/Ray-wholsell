const express = require('express');
const { 
  createOrderFromCart, 
  getUserOrders, 
  getOrderDetails,
  getAllOrders,
  updateOrderStatus,
  sendManufacturerInquiry,
  confirmOrder,
  processAdminConfirmedOrderPayment
} = require('../Controllers/orderController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

const router = express.Router();

// Wholesaler routes (existing)
router.post('/checkout', protect, restrictTo('user'), createOrderFromCart);
router.post('/payment/admin-confirmed', protect, restrictTo('user'), processAdminConfirmedOrderPayment);
router.get('/my-orders', protect, restrictTo('user'), getUserOrders);
router.get('/details/:orderId', protect, restrictTo('user'), getOrderDetails);

// Admin routes
router.get('/all-orders', protect, restrictTo('admin'), getAllOrders);
router.patch('/update-status/:orderId', protect, restrictTo('admin'), updateOrderStatus);
router.post('/manufacturer-inquiry', protect, restrictTo('admin'), sendManufacturerInquiry);
router.post('/confirm-order', protect, restrictTo('admin'), confirmOrder);

module.exports = router;
