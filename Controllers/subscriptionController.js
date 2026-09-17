const Subscription = require('../Models/subscriptionModel');
const Order = require('../Models/orderModel');
const User = require('../Models/user');
const Product = require('../Models/productModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============ CREATE SUBSCRIPTION ============
exports.createSubscription = async (req, res) => {
  try {
    const { items, frequency, deliveryAddress, discountPercentage, customerNotes } = req.body;
    const userId = req.user._id;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Subscription must contain at least one item' });
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product ${item.product} not found` });
      }

      const itemPrice = item.price || product.variants?.[0]?.price || product.buyPrice || 0;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        product: item.product,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: itemPrice,
        name: product.name,
        sku: product.sku,
      });
    }

    // Calculate discount
    const discountAmount = (subtotal * (discountPercentage || 0)) / 100;
    const shippingCost = subtotal > 500 ? 0 : 50; // Free shipping over $500
    const total = subtotal - discountAmount + shippingCost;

    // Calculate next billing date based on frequency
    const frequencyDays = {
      '7days': 7,
      '14days': 14,
      '30days': 30,
      '60days': 60,
      '90days': 90,
    };

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + frequencyDays[frequency || '30days']);

    // Create Stripe customer if not exists
    let stripeCustomerId = null;
    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = customer.id;
      await user.save();
    } else {
      stripeCustomerId = user.stripeCustomerId;
    }

    // Create subscription
    const subscription = await Subscription.create({
      user: userId,
      websiteRole: user.role || 'user',
      items: processedItems,
      subtotal,
      discountPercentage: discountPercentage || 0,
      discountAmount,
      total,
      frequency: frequency || '30days',
      deliveryAddress,
      shippingCost,
      nextBillingDate,
      stripeCustomerId,
      customerNotes,
      editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Editable for 24 hours
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ GET USER SUBSCRIPTIONS ============
exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = 'active' } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const subscriptions = await Subscription.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name rhlId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ GET SINGLE SUBSCRIPTION ============
exports.getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId })
      .populate('user', 'name email phone')
      .populate('items.product')
      .populate('lastOrderId');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ UPDATE SUBSCRIPTION ITEMS ============
exports.updateSubscriptionItems = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { items, discountPercentage } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Check if still editable
    if (subscription.editableUntil < new Date()) {
      return res.status(400).json({ success: false, message: 'Subscription can no longer be edited for this delivery' });
    }

    // Recalculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product ${item.product} not found` });
      }

      const itemPrice = item.price || product.variants?.[0]?.price || product.buyPrice || 0;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        product: item.product,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: itemPrice,
        name: product.name,
        sku: product.sku,
      });
    }

    const discountAmount = (subtotal * (discountPercentage || 0)) / 100;
    const shippingCost = subtotal > 500 ? 0 : 50;
    const total = subtotal - discountAmount + shippingCost;

    subscription.items = processedItems;
    subscription.subtotal = subtotal;
    subscription.discountPercentage = discountPercentage || 0;
    subscription.discountAmount = discountAmount;
    subscription.shippingCost = shippingCost;
    subscription.total = total;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription items updated',
      subscription,
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ PAUSE SUBSCRIPTION ============
exports.pauseSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot pause a cancelled subscription' });
    }

    subscription.status = 'paused';
    subscription.pausedAt = new Date();
    subscription.pausedReason = reason || null;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription paused successfully',
      subscription,
    });
  } catch (error) {
    console.error('Pause subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ RESUME SUBSCRIPTION ============
exports.resumeSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status !== 'paused') {
      return res.status(400).json({ success: false, message: 'Only paused subscriptions can be resumed' });
    }

    subscription.status = 'active';
    subscription.pausedAt = null;
    subscription.pausedReason = null;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription,
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ SKIP DELIVERY ============
exports.skipDelivery = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (!subscription.canSkipNext) {
      return res.status(400).json({ success: false, message: 'Cannot skip this delivery' });
    }

    // Add to skipped deliveries
    subscription.skippedDeliveries.push({
      date: subscription.nextBillingDate,
      reason: reason || null,
    });

    // Move next billing date forward by frequency
    const frequencyDays = {
      '7days': 7,
      '14days': 14,
      '30days': 30,
      '60days': 60,
      '90days': 90,
    };

    const newBillingDate = new Date(subscription.nextBillingDate);
    newBillingDate.setDate(newBillingDate.getDate() + frequencyDays[subscription.frequency]);
    subscription.nextBillingDate = newBillingDate;

    subscription.canSkipNext = false; // Can only skip once per cycle

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Delivery skipped successfully',
      subscription,
    });
  } catch (error) {
    console.error('Skip delivery error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ CANCEL SUBSCRIPTION ============
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Subscription is already cancelled' });
    }

    // Cancel Stripe subscription if exists
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
      }
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || null;
    subscription.cancelledBy = 'customer';

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ ADMIN: UPDATE SUBSCRIPTION STATUS ============
exports.adminUpdateSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { status, adminNotes } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.status = status;
    if (adminNotes) {
      subscription.adminNotes = adminNotes;
    }

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription status updated',
      subscription,
    });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ ADMIN: GET ALL SUBSCRIPTIONS ============
exports.adminGetAllSubscriptions = async (req, res) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (role) query.websiteRole = role;

    const skip = (page - 1) * limit;
    const subscriptions = await Subscription.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name rhlId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Subscription.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      subscriptions,
    });
  } catch (error) {
    console.error('Admin get all error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ UPDATE DELIVERY FREQUENCY ============
exports.updateFrequency = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { frequency } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const frequencyDays = {
      '7days': 7,
      '14days': 14,
      '30days': 30,
      '60days': 60,
      '90days': 90,
    };

    if (!frequencyDays[frequency]) {
      return res.status(400).json({ success: false, message: 'Invalid frequency' });
    }

    subscription.frequency = frequency;

    // Recalculate next billing date
    const newBillingDate = new Date();
    newBillingDate.setDate(newBillingDate.getDate() + frequencyDays[frequency]);
    subscription.nextBillingDate = newBillingDate;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription frequency updated',
      subscription,
    });
  } catch (error) {
    console.error('Update frequency error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ UPDATE DELIVERY ADDRESS ============
exports.updateDeliveryAddress = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { deliveryAddress } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.deliveryAddress = deliveryAddress;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Delivery address updated',
      subscription,
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
