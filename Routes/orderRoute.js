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
const {
  createRetailerOrder,
  getRetailerOrders,
  getRetailerOrderDetails,
  getPendingRetailerOrders,
  confirmRetailerOrder,
  rejectRetailerOrder,
  getOrderInvoice,
} = require('../Controllers/retailerOrderController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

const router = express.Router();

// Wholesaler routes (existing)
router.post('/checkout', protect, restrictTo('user'), createOrderFromCart);
router.post('/payment/admin-confirmed', protect, restrictTo('user'), processAdminConfirmedOrderPayment);
router.get('/my-orders', protect, restrictTo('user'), getUserOrders);
router.get('/details/:orderId', protect, restrictTo('user'), getOrderDetails);

// Retailer routes (new)
router.post('/create-retailer-order', protect, restrictTo('retailer'), createRetailerOrder);
router.get('/retailer-orders', protect, restrictTo('retailer'), getRetailerOrders);
router.get('/retailer-order/:orderId', protect, restrictTo('retailer'), getRetailerOrderDetails);
router.get('/retailer-invoice/:orderId', protect, restrictTo('retailer'), getOrderInvoice);

// Retailer Payment routes
const { 
  processRetailerPayment, 
  getPaymentHistory,
  handleStripeWebhook 
} = require('../Controllers/retailerPaymentController');

router.post('/process-retailer-payment', protect, restrictTo('retailer'), processRetailerPayment);
router.get('/payment-history', protect, restrictTo('retailer'), getPaymentHistory);
// Note: Stripe webhook handled separately in main app.js due to raw body requirement
// router.post('/stripe-webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

// Admin routes
router.get('/all-orders', protect, restrictTo('admin'), getAllOrders);
router.get('/pending-retailer-orders', protect, restrictTo('admin'), getPendingRetailerOrders);
router.patch('/update-status/:orderId', protect, restrictTo('admin'), updateOrderStatus);
router.post('/manufacturer-inquiry', protect, restrictTo('admin'), sendManufacturerInquiry);
router.post('/confirm-order', protect, restrictTo('admin'), confirmOrder);
router.patch('/confirm-retailer/:orderId', protect, restrictTo('admin'), confirmRetailerOrder);
router.patch('/reject-retailer/:orderId', protect, restrictTo('admin'), rejectRetailerOrder);

module.exports = router;
