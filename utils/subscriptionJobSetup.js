const SubscriptionBillingJob = require('../Jobs/subscriptionBillingJob');
const SubscriptionRetry = require('./subscriptionRetry');
const cron = require('node-cron');

/**
 * Initialize all subscription background jobs
 * Call this in your app.js or server startup file
 * 
 * Example:
 * const { initializeSubscriptionJobs } = require('./Utils/subscriptionJobSetup');
 * initializeSubscriptionJobs();
 */

class SubscriptionJobSetup {
  static initializeSubscriptionJobs() {
    console.log('🚀 Initializing Subscription Jobs...');

    try {
      // Main billing job - Daily at 2:00 AM
      this.startBillingJob();

      // Retry job - Every 6 hours
      this.startRetryJob();

      // Cleanup job - Weekly on Sundays at 3:00 AM
      this.startCleanupJob();

      console.log('✅ All subscription jobs initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize subscription jobs:', error);
      throw error;
    }
  }

  /**
   * Start the main subscription billing job
   * Runs daily at 2:00 AM
   */
  static startBillingJob() {
    console.log('📅 Starting Subscription Billing Job (Daily at 2:00 AM)...');
    SubscriptionBillingJob.start();
  }

  /**
   * Start the retry job for failed payments
   * Runs every 6 hours to check for scheduled retries
   */
  static startRetryJob() {
    console.log('🔄 Starting Subscription Retry Job (Every 6 hours)...');
    
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Processing scheduled payment retries...`);
        const results = await SubscriptionRetry.executeScheduledRetries();
        console.log(`✅ Retry job completed:`, results);
      } catch (error) {
        console.error('❌ Retry job failed:', error);
      }
    });
  }

  /**
   * Start the cleanup job
   * Runs weekly to clean up old records and update statuses
   */
  static startCleanupJob() {
    console.log('🧹 Starting Subscription Cleanup Job (Weekly on Sunday at 3:00 AM)...');
    
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running subscription cleanup...`);
        
        // Import here to avoid circular dependencies
        const Subscription = require('../Models/subscriptionModel');

        // Clean up old cancelled subscriptions (older than 90 days)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        
        const result = await Subscription.updateMany(
          {
            status: 'cancelled',
            cancelledDate: { $lte: ninetyDaysAgo },
          },
          {
            status: 'archived',
            lastUpdated: new Date(),
          }
        );

        // Mark expired subscriptions
        const expiredResult = await Subscription.updateMany(
          {
            status: 'active',
            endDate: { $lte: new Date() },
          },
          {
            status: 'expired',
            lastUpdated: new Date(),
          }
        );

        console.log(`✅ Cleanup completed - Archived: ${result.modifiedCount}, Expired: ${expiredResult.modifiedCount}`);
      } catch (error) {
        console.error('❌ Cleanup job failed:', error);
      }
    });
  }

  /**
   * Get all active jobs and their schedules
   */
  static getJobSchedules() {
    return {
      billing: {
        frequency: 'Daily',
        time: '2:00 AM',
        purpose: 'Process active subscriptions ready for billing',
        pattern: '0 2 * * *',
      },
      retry: {
        frequency: 'Every 6 hours',
        time: '12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM',
        purpose: 'Execute scheduled payment retries',
        pattern: '0 */6 * * *',
      },
      cleanup: {
        frequency: 'Weekly',
        time: 'Sunday at 3:00 AM',
        purpose: 'Archive old cancelled subscriptions and mark expired ones',
        pattern: '0 3 * * 0',
      },
    };
  }
}

module.exports = SubscriptionJobSetup;
