const cron = require('node-cron');
const Subscription = require('../Models/subscriptionModel');
const Order = require('../Models/orderModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Subscription Billing Job
 * Runs daily at 2 AM to process recurring orders for active subscriptions
 * - Finds subscriptions with nextBillingDate <= today
 * - Creates orders with subscription items and pricing
 * - Processes Stripe payments
 * - Updates subscription billing history
 */

class SubscriptionBillingJob {
  /**
   * Start the cron job
   * Pattern: 0 2 * * * = Daily at 2:00 AM
   */
  static start() {
    console.log('🔄 Subscription Billing Job initialized');
    
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Processing subscription billings...`);
        const result = await this.processSubscriptions();
        console.log(`✅ Subscription billing processed:`, result);
      } catch (error) {
        console.error('❌ Subscription billing job failed:', error);
        // Log to error tracking service (Sentry, DataDog, etc.)
      }
    });
  }

  /**
   * Main process for handling all subscriptions ready for billing
   */
  static async processSubscriptions() {
    const stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      startTime: new Date(),
    };

    try {
      // Find all active subscriptions ready for billing
      const subscriptionsToProcess = await Subscription.find({
        status: 'active',
        nextBillingDate: { $lte: new Date() },
      })
        .populate('user')
        .lean();

      console.log(`Found ${subscriptionsToProcess.length} subscriptions to process`);
      stats.processed = subscriptionsToProcess.length;

      // Process each subscription
      for (const subscription of subscriptionsToProcess) {
        try {
          await this.processSubscription(subscription);
          stats.succeeded++;
        } catch (error) {
          stats.failed++;
          stats.errors.push({
            subscriptionId: subscription._id,
            subscriptionNumber: subscription.subscriptionNumber,
            error: error.message,
          });
          console.error(`Failed to process subscription ${subscription.subscriptionNumber}:`, error.message);
        }
      }

      // Log job completion
      stats.endTime = new Date();
      stats.duration = stats.endTime - stats.startTime;
      
      // Send job summary to monitoring service if needed
      await this.logJobSummary(stats);

      return stats;
    } catch (error) {
      console.error('Fatal error in subscription billing job:', error);
      throw error;
    }
  }

  /**
   * Process a single subscription
   */
  static async processSubscription(subscription) {
    // Check if subscription can be skipped
    if (subscription.skippedDeliveries && subscription.skippedDeliveries.length > 0) {
      const lastSkip = subscription.skippedDeliveries[subscription.skippedDeliveries.length - 1];
      const lastSkipDate = new Date(lastSkip.date);
      const today = new Date();
      
      // If already skipped this cycle, don't process
      if (this.isSameDeliveryDate(lastSkipDate, today)) {
        console.log(`Subscription ${subscription.subscriptionNumber} skipped for this cycle`);
        
        // Update nextBillingDate to next cycle
        const nextDate = this.addDays(today, this.frequencyToDays(subscription.frequency));
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            nextBillingDate: nextDate,
            canSkipNext: true,
          }
        );
        return;
      }
    }

    // Check if subscription is within edit window (24 hours before delivery)
    const editableUntil = new Date(subscription.editableUntil);
    const now = new Date();
    
    if (now < editableUntil) {
      console.log(`Subscription ${subscription.subscriptionNumber} still in edit window, deferring`);
      return;
    }

    // Process Stripe charge
    await this.processStripeCharge(subscription);

    // Create order from subscription
    const order = await this.createOrderFromSubscription(subscription);

    // Update subscription records
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        lastBilledDate: new Date(),
        nextBillingDate: this.calculateNextBillingDate(subscription.frequency),
        totalOrdersGenerated: (subscription.totalOrdersGenerated || 0) + 1,
        lastOrderReference: order._id,
        lastUpdated: new Date(),
        canSkipNext: true, // Reset skip flag for next cycle
      }
    );

    console.log(`✅ Processed subscription ${subscription.subscriptionNumber}, order: ${order.orderNumber}`);
  }

  /**
   * Process payment via Stripe
   */
  static async processStripeCharge(subscription) {
    try {
      // Validate Stripe customer exists
      if (!subscription.stripeCustomerId) {
        throw new Error('No Stripe customer ID for subscription');
      }

      // Get customer's default payment method
      const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);
      
      if (!customer.invoice_settings?.default_payment_method) {
        throw new Error('No default payment method on file');
      }

      // Create charge
      const charge = await stripe.paymentIntents.create({
        amount: Math.round(subscription.total * 100), // Convert to cents
        currency: 'usd',
        customer: subscription.stripeCustomerId,
        payment_method: customer.invoice_settings.default_payment_method,
        off_session: true,
        confirm: true,
        description: `Subscription Order #${subscription.subscriptionNumber}`,
        metadata: {
          subscriptionId: subscription._id.toString(),
          subscriptionNumber: subscription.subscriptionNumber,
          userId: subscription.user.toString(),
        },
      });

      if (charge.status !== 'succeeded') {
        throw new Error(`Payment failed with status: ${charge.status}`);
      }

      console.log(`💳 Charged $${subscription.total} for subscription ${subscription.subscriptionNumber}`);
      return charge;
    } catch (error) {
      console.error(`Payment failed for subscription ${subscription.subscriptionNumber}:`, error.message);
      
      // Update subscription status to payment_failed
      await Subscription.updateOne(
        { _id: subscription._id },
        {
          status: 'payment_failed',
          lastPaymentError: error.message,
          lastPaymentAttempt: new Date(),
        }
      );

      throw error;
    }
  }

  /**
   * Create an Order document from Subscription
   */
  static async createOrderFromSubscription(subscription) {
    try {
      // Generate order number
      const orderNumber = `SUB-${subscription.subscriptionNumber}-${Date.now()}`;

      // Create order object
      const orderData = {
        orderNumber,
        user: subscription.user,
        websiteRole: subscription.websiteRole,
        items: subscription.items.map(item => ({
          product: item.product,
          name: item.name,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: subscription.subtotal,
        discountPercentage: subscription.discountPercentage,
        discount: subscription.discount,
        shippingCost: subscription.shippingCost,
        total: subscription.total,
        status: 'pending_fulfillment',
        paymentStatus: 'completed',
        paymentMethod: 'stripe',
        deliveryAddress: subscription.deliveryAddress,
        billingAddress: subscription.deliveryAddress,
        orderDate: new Date(),
        expectedDeliveryDate: new Date(),
        notes: `Auto-generated from subscription #${subscription.subscriptionNumber}`,
        isSubscriptionOrder: true,
        subscriptionReference: subscription._id,
        stripeChargeId: subscription.stripeSubscriptionId,
      };

      // Create order
      const order = await Order.create(orderData);

      console.log(`📦 Created order ${order.orderNumber} from subscription ${subscription.subscriptionNumber}`);
      return order;
    } catch (error) {
      console.error('Failed to create order from subscription:', error.message);
      throw error;
    }
  }

  /**
   * Calculate next billing date based on frequency
   */
  static calculateNextBillingDate(frequency) {
    const today = new Date();
    const daysToAdd = this.frequencyToDays(frequency);
    return this.addDays(today, daysToAdd);
  }

  /**
   * Convert frequency string to days
   */
  static frequencyToDays(frequency) {
    const frequencyMap = {
      '7days': 7,
      '14days': 14,
      '30days': 30,
      '60days': 60,
      '90days': 90,
    };
    return frequencyMap[frequency] || 30;
  }

  /**
   * Add days to a date
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Check if two dates are the same delivery date (for skip purposes)
   */
  static isSameDeliveryDate(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Log job summary to monitoring service
   */
  static async logJobSummary(stats) {
    console.log('📊 Job Summary:');
    console.log(`  - Total processed: ${stats.processed}`);
    console.log(`  - Succeeded: ${stats.succeeded}`);
    console.log(`  - Failed: ${stats.failed}`);
    console.log(`  - Duration: ${stats.duration}ms`);
    
    if (stats.errors.length > 0) {
      console.log('❌ Errors:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.subscriptionNumber}: ${err.error}`);
      });
    }

    // TODO: Send to Sentry/DataDog/CloudWatch if needed
    // await sendToMonitoring(stats);
  }

  /**
   * Retry failed subscription (manual trigger)
   */
  static async retryFailedSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId).populate('user');
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'payment_failed') {
        throw new Error('Subscription is not in payment_failed status');
      }

      await this.processSubscription(subscription);
      
      // Reset status to active
      await Subscription.updateOne(
        { _id: subscriptionId },
        { status: 'active', lastPaymentError: null }
      );

      console.log(`✅ Retried subscription ${subscription.subscriptionNumber}`);
      return { success: true, subscription };
    } catch (error) {
      console.error('Retry failed:', error.message);
      throw error;
    }
  }
}

module.exports = SubscriptionBillingJob;
