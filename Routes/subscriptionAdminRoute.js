const express = require('express');
const subscriptionAdminController = require('../Controllers/subscriptionAdminController');
const { protect, restrictTo } = require('../Middlewares/authMiddleware');

const router = express.Router();

/**
 * Admin Subscription Routes
 * All routes require authentication and admin role
 */

// Middleware: Protect all routes - Admin only
router.use(protect);
router.use(restrictTo('admin'));

// Get statistics dashboard
router.get('/dashboard/stats', subscriptionAdminController.getSubscriptionStats);

// Get all subscriptions (with filtering, sorting, pagination)
router.get('/all', subscriptionAdminController.getAllSubscriptions);

// Export subscriptions
router.get('/export', subscriptionAdminController.exportSubscriptions);

// Get specific subscription details
router.get('/:subscriptionId/details', subscriptionAdminController.getSubscriptionDetails);

// Get activity/audit log for subscription
router.get('/:subscriptionId/activity-log', subscriptionAdminController.getActivityLog);

// Get retry history for subscription
router.get('/:subscriptionId/retry-history', subscriptionAdminController.getRetryHistory);

// Update subscription status
router.patch('/:subscriptionId/status', subscriptionAdminController.updateSubscriptionStatus);

// Retry failed payment
router.post('/:subscriptionId/retry-payment', subscriptionAdminController.retryFailedPayment);

// Bulk update subscriptions
router.post('/bulk/update', subscriptionAdminController.bulkUpdateSubscriptions);

module.exports = router;
