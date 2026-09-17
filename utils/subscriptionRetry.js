const Subscription = require('../Models/subscriptionModel');
const SubscriptionBillingJob = require('../Jobs/subscriptionBillingJob');

/**
 * Handle subscription payment retry logic
 * - Automatic retries with exponential backoff
 * - Manual admin retry endpoint
 * - Email notifications for failed charges
 */

class SubscriptionRetry {
  /**
   * Retry a failed subscription with exponential backoff
   * Max attempts: 3
   * Delays: 1 hour, 4 hours, 24 hours
   */
  static async autoRetryFailedSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check retry attempts
      const attempts = subscription.paymentRetries || [];
      
      if (attempts.length >= 3) {
        console.log(`Max retries reached for subscription ${subscription.subscriptionNumber}`);
        
        // Send notification to user about failed subscription
        await this.notifyUserOfFailedSubscription(subscription);
        
        // Update status to suspended
        await Subscription.updateOne(
          { _id: subscriptionId },
          { status: 'suspended', lastUpdated: new Date() }
        );
        
        return { status: 'max_retries_reached' };
      }

      // Calculate delay based on attempt number
      const delays = [3600000, 14400000, 86400000]; // 1h, 4h, 24h
      const delayMs = delays[attempts.length];
      
      const nextRetryTime = new Date(Date.now() + delayMs);
      
      // Schedule retry
      await Subscription.updateOne(
        { _id: subscriptionId },
        {
          $push: {
            paymentRetries: {
              attemptNumber: attempts.length + 1,
              attemptedAt: new Date(),
              nextRetryTime,
              status: 'scheduled',
            },
          },
        }
      );

      console.log(`Scheduled retry #${attempts.length + 1} for ${subscription.subscriptionNumber} at ${nextRetryTime}`);
      
      return { 
        status: 'retry_scheduled', 
        attemptNumber: attempts.length + 1,
        nextRetryTime,
      };
    } catch (error) {
      console.error('Auto-retry failed:', error);
      throw error;
    }
  }

  /**
   * Execute retry for subscriptions past their retry time
   * Called by scheduler job
   */
  static async executeScheduledRetries() {
    try {
      const now = new Date();
      
      const subscriptionsToRetry = await Subscription.find({
        status: 'payment_failed',
        'paymentRetries.nextRetryTime': { $lte: now },
        'paymentRetries.status': 'scheduled',
      }).populate('user');

      console.log(`Found ${subscriptionsToRetry.length} subscriptions to retry`);

      const results = {
        succeeded: 0,
        failed: 0,
        errors: [],
      };

      for (const subscription of subscriptionsToRetry) {
        try {
          // Get latest retry record
          const latestRetry = subscription.paymentRetries[subscription.paymentRetries.length - 1];
          
          // Mark as attempting
          await Subscription.updateOne(
            { _id: subscription._id },
            {
              $set: {
                'paymentRetries.-1.status': 'attempting',
                'paymentRetries.-1.attemptedAt': new Date(),
              },
            }
          );

          // Attempt payment
          await SubscriptionBillingJob.processSubscription(subscription);

          // Mark as succeeded and restore to active
          await Subscription.updateOne(
            { _id: subscription._id },
            {
              $set: {
                'paymentRetries.-1.status': 'succeeded',
                'paymentRetries.-1.completedAt': new Date(),
              },
              status: 'active',
              lastPaymentError: null,
            }
          );

          results.succeeded++;
          console.log(`✅ Retry succeeded for ${subscription.subscriptionNumber}`);

          // Notify user of successful retry
          await this.notifyUserOfSuccessfulRetry(subscription);
        } catch (error) {
          results.failed++;
          results.errors.push({
            subscriptionNumber: subscription.subscriptionNumber,
            error: error.message,
          });

          // Mark retry as failed
          await Subscription.updateOne(
            { _id: subscription._id },
            {
              $set: {
                'paymentRetries.-1.status': 'failed',
                'paymentRetries.-1.error': error.message,
                'paymentRetries.-1.completedAt': new Date(),
              },
            }
          );

          console.error(`Retry failed for ${subscription.subscriptionNumber}:`, error.message);
        }
      }

      return results;
    } catch (error) {
      console.error('Execute scheduled retries failed:', error);
      throw error;
    }
  }

  /**
   * Manual retry by admin
   */
  static async manualRetry(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId).populate('user');
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Attempt payment immediately
      await SubscriptionBillingJob.processSubscription(subscription);

      // Update status
      await Subscription.updateOne(
        { _id: subscriptionId },
        {
          status: 'active',
          lastPaymentError: null,
          lastUpdated: new Date(),
        }
      );

      console.log(`✅ Manual retry succeeded for ${subscription.subscriptionNumber}`);
      return { success: true, subscription };
    } catch (error) {
      console.error('Manual retry failed:', error);

      // Update error message
      await Subscription.updateOne(
        { _id: subscriptionId },
        {
          lastPaymentError: error.message,
          lastPaymentAttempt: new Date(),
        }
      );

      throw error;
    }
  }

  /**
   * Notify user of failed charge
   */
  static async notifyUserOfFailedSubscription(subscription) {
    try {
      // TODO: Send email via EmailService
      console.log(`📧 Email notification queued for ${subscription.user.email} - payment failed`);
      
      // Email template variables
      const emailData = {
        to: subscription.user.email,
        subject: `Payment Failed for Subscription #${subscription.subscriptionNumber}`,
        template: 'subscription_payment_failed',
        data: {
          subscriptionNumber: subscription.subscriptionNumber,
          amount: subscription.total,
          frequency: subscription.frequency,
          nextRetryDate: subscription.nextBillingDate,
        },
      };

      // await EmailService.send(emailData);
    } catch (error) {
      console.error('Failed to notify user of failed subscription:', error);
    }
  }

  /**
   * Notify user of successful retry
   */
  static async notifyUserOfSuccessfulRetry(subscription) {
    try {
      // TODO: Send email via EmailService
      console.log(`📧 Email notification queued for ${subscription.user.email} - payment successful`);
      
      const emailData = {
        to: subscription.user.email,
        subject: `Payment Successful for Subscription #${subscription.subscriptionNumber}`,
        template: 'subscription_payment_successful',
        data: {
          subscriptionNumber: subscription.subscriptionNumber,
          amount: subscription.total,
          frequency: subscription.frequency,
          nextDeliveryDate: subscription.nextBillingDate,
        },
      };

      // await EmailService.send(emailData);
    } catch (error) {
      console.error('Failed to notify user of successful retry:', error);
    }
  }

  /**
   * Get retry history for a subscription
   */
  static async getRetryHistory(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return {
        subscriptionNumber: subscription.subscriptionNumber,
        status: subscription.status,
        currentAttempts: subscription.paymentRetries || [],
        lastPaymentError: subscription.lastPaymentError,
        lastPaymentAttempt: subscription.lastPaymentAttempt,
      };
    } catch (error) {
      console.error('Failed to get retry history:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionRetry;
