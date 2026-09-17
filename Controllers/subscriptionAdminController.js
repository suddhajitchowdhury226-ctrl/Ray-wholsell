const Subscription = require('../Models/subscriptionModel');
const SubscriptionRetry = require('../Utils/subscriptionRetry');
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsync');

/**
 * Admin subscription management
 * Handles subscription oversight, issue resolution, and manual interventions
 */

// Get all subscriptions with advanced filtering
exports.getAllSubscriptions = catchAsync(async (req, res, next) => {
  const {
    status,
    role,
    user,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
    search,
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (role) filter.websiteRole = role;
  if (user) filter.user = user;

  if (search) {
    filter.$or = [
      { subscriptionNumber: { $regex: search, $options: 'i' } },
      { 'deliveryAddress.name': { $regex: search, $options: 'i' } },
      { 'user.email': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = { [sortBy]: parseInt(sortOrder) };

  const subscriptions = await Subscription.find(filter)
    .populate('user', 'email firstName lastName')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Subscription.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: subscriptions.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    subscriptions,
  });
});

// Get subscription details for admin
exports.getSubscriptionDetails = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const subscription = await Subscription.findById(subscriptionId)
    .populate('user', 'email firstName lastName phone')
    .populate('items.product');

  if (!subscription) {
    return next(new AppError('Subscription not found', 404));
  }

  res.status(200).json({
    status: 'success',
    subscription,
  });
});

// Update subscription status manually
exports.updateSubscriptionStatus = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { status, notes, reason } = req.body;

  const validStatuses = ['active', 'paused', 'cancelled', 'payment_failed', 'suspended', 'expired'];

  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status provided', 400));
  }

  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    return next(new AppError('Subscription not found', 404));
  }

  // Update subscription status
  const updateData = {
    status,
    lastUpdated: new Date(),
  };

  if (notes) {
    updateData.adminNotes = (subscription.adminNotes || '') + `\n[${new Date().toISOString()}] ${req.user.email}: ${notes}`;
  }

  if (status === 'cancelled') {
    updateData.cancelledDate = new Date();
    updateData.cancellationReason = reason || 'Cancelled by admin';
  }

  if (status === 'paused') {
    updateData.pausedDate = new Date();
  }

  if (status === 'active') {
    updateData.pausedDate = null;
  }

  const updated = await Subscription.findByIdAndUpdate(subscriptionId, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    subscription: updated,
  });
});

// Retry failed subscription payment
exports.retryFailedPayment = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    return next(new AppError('Subscription not found', 404));
  }

  if (subscription.status !== 'payment_failed') {
    return next(new AppError('Subscription is not in payment_failed status', 400));
  }

  try {
    const result = await SubscriptionRetry.manualRetry(subscriptionId);

    res.status(200).json({
      status: 'success',
      message: 'Payment retry successful',
      subscription: result.subscription,
    });
  } catch (error) {
    return next(new AppError(`Payment retry failed: ${error.message}`, 400));
  }
});

// Get retry history
exports.getRetryHistory = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const history = await SubscriptionRetry.getRetryHistory(subscriptionId);

  res.status(200).json({
    status: 'success',
    history,
  });
});

// Get subscription activity log
exports.getActivityLog = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    return next(new AppError('Subscription not found', 404));
  }

  const activityLog = {
    created: subscription.startDate,
    lastUpdated: subscription.lastUpdated,
    lastBilled: subscription.lastBilledDate,
    paused: subscription.pausedDate,
    cancelled: subscription.cancelledDate,
    totalOrders: subscription.totalOrdersGenerated,
    skippedDeliveries: subscription.skippedDeliveries,
    adminNotes: subscription.adminNotes,
    paymentRetries: subscription.paymentRetries,
  };

  res.status(200).json({
    status: 'success',
    activityLog,
  });
});

// Export subscription data (CSV/JSON)
exports.exportSubscriptions = catchAsync(async (req, res, next) => {
  const { format = 'json', status, role } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (role) filter.websiteRole = role;

  const subscriptions = await Subscription.find(filter)
    .populate('user', 'email firstName lastName')
    .lean();

  if (format === 'csv') {
    // Generate CSV
    const csv = convertToCSV(subscriptions);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.send(csv);
  } else {
    // JSON export
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', 'attachment; filename=subscriptions.json');
    res.send(JSON.stringify(subscriptions, null, 2));
  }
});

// Get subscription statistics/dashboard
exports.getSubscriptionStats = catchAsync(async (req, res, next) => {
  const { timeframe = '30' } = req.query;

  const daysAgo = parseInt(timeframe);
  const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const stats = {
    total: await Subscription.countDocuments(),
    active: await Subscription.countDocuments({ status: 'active' }),
    paused: await Subscription.countDocuments({ status: 'paused' }),
    cancelled: await Subscription.countDocuments({ status: 'cancelled' }),
    paymentFailed: await Subscription.countDocuments({ status: 'payment_failed' }),
    suspended: await Subscription.countDocuments({ status: 'suspended' }),
    
    recentCreated: await Subscription.countDocuments({
      createdAt: { $gte: startDate },
    }),

    recentCancelled: await Subscription.countDocuments({
      cancelledDate: { $gte: startDate },
    }),

    totalRevenue: (
      await Subscription.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ])
    )[0]?.total || 0,

    revenueByFrequency: await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$frequency',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]),

    revenueByRole: await Subscription.aggregate([
      {
        $group: {
          _id: '$websiteRole',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]),

    averageOrderValue: 0,
    churnRate: 0,
  };

  // Calculate average order value
  if (stats.active > 0) {
    const avgResult = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$total' },
        },
      },
    ]);
    stats.averageOrderValue = avgResult[0]?.avg || 0;
  }

  // Calculate churn rate
  if (stats.total > 0) {
    stats.churnRate = ((stats.cancelled / stats.total) * 100).toFixed(2);
  }

  res.status(200).json({
    status: 'success',
    stats,
    timeframe: `Last ${daysAgo} days`,
  });
});

// Bulk update subscriptions
exports.bulkUpdateSubscriptions = catchAsync(async (req, res, next) => {
  const { subscriptionIds, updates } = req.body;

  if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
    return next(new AppError('Please provide subscription IDs', 400));
  }

  const result = await Subscription.updateMany(
    { _id: { $in: subscriptionIds } },
    {
      ...updates,
      lastUpdated: new Date(),
    }
  );

  res.status(200).json({
    status: 'success',
    message: `Updated ${result.modifiedCount} subscriptions`,
    modifiedCount: result.modifiedCount,
  });
});

// Helper: Convert subscriptions to CSV
function convertToCSV(subscriptions) {
  if (subscriptions.length === 0) return '';

  const headers = [
    'Subscription Number',
    'User Email',
    'User Name',
    'Status',
    'Frequency',
    'Total Amount',
    'Discount %',
    'Next Billing Date',
    'Created Date',
    'Items Count',
  ];

  const rows = subscriptions.map(sub => [
    sub.subscriptionNumber,
    sub.user?.email || '',
    sub.user?.firstName + ' ' + sub.user?.lastName || '',
    sub.status,
    sub.frequency,
    sub.total,
    sub.discountPercentage,
    sub.nextBillingDate,
    sub.createdAt,
    sub.items?.length || 0,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

module.exports = exports;
