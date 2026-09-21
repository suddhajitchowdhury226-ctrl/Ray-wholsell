const express = require('express');
const router = express.Router();
const {
  submitOrderRequest,
  getMyOrders,
  getPendingOrders,
  getAllRetailerOrders,
  confirmOrder,
  createPaymentIntent,
  confirmPayment,
  cancelOrder
} = require('../Controllers/retailerOrderController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

// User routes (retailer)
router.post('/submit', protect, submitOrderRequest);
router.get('/my-orders', protect, getMyOrders);
router.post('/:orderId/payment-intent', protect, createPaymentIntent);
router.post('/:orderId/cancel', protect, cancelOrder);

// Admin routes
router.get('/pending', protect, restrictTo('admin'), getPendingOrders);
router.get('/all', protect, restrictTo('admin'), getAllRetailerOrders);
router.post('/:orderId/confirm', protect, restrictTo('admin'), confirmOrder);
router.post('/:orderId/payment/confirm', protect, restrictTo('admin'), confirmPayment);
router.post('/:orderId/cancel-admin', protect, restrictTo('admin'), cancelOrder);

module.exports = router;
