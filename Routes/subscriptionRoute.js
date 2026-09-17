const express = require('express');
const router = express.Router();
const {
  createSubscription,
  getUserSubscriptions,
  getSubscription,
  updateSubscriptionItems,
  pauseSubscription,
  resumeSubscription,
  skipDelivery,
  cancelSubscription,
  adminUpdateSubscriptionStatus,
  adminGetAllSubscriptions,
  updateFrequency,
  updateDeliveryAddress,
} = require('../Controllers/subscriptionController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

// ============ USER ROUTES (Protected) ============

// Create subscription
router.post('/create', protect, createSubscription);

// Get user's subscriptions
router.get('/my-subscriptions', protect, getUserSubscriptions);

// Get single subscription
router.get('/:subscriptionId', protect, getSubscription);

// Update subscription items
router.put('/:subscriptionId/items', protect, updateSubscriptionItems);

// Update subscription frequency
router.put('/:subscriptionId/frequency', protect, updateFrequency);

// Update delivery address
router.put('/:subscriptionId/address', protect, updateDeliveryAddress);

// Pause subscription
router.post('/:subscriptionId/pause', protect, pauseSubscription);

// Resume subscription
router.post('/:subscriptionId/resume', protect, resumeSubscription);

// Skip delivery
router.post('/:subscriptionId/skip', protect, skipDelivery);

// Cancel subscription
router.post('/:subscriptionId/cancel', protect, cancelSubscription);

// ============ ADMIN ROUTES ============

// Get all subscriptions (admin only)
router.get('/admin/all-subscriptions', protect, restrictTo('admin'), adminGetAllSubscriptions);

// Update subscription status (admin only)
router.patch('/:subscriptionId/admin/status', protect, restrictTo('admin'), adminUpdateSubscriptionStatus);

module.exports = router;
