const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./Models/orderModel');

async function migrateOrders() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Finding orders with pending_review status...');
    const pendingReviewOrders = await Order.find({ status: 'pending_review' });
    
    if (pendingReviewOrders.length === 0) {
      console.log('✅ No pending_review orders found');
      process.exit(0);
    }

    console.log(`\n⚠️ Found ${pendingReviewOrders.length} orders with 'pending_review' status`);
    console.log('These will be migrated to "draft" status\n');

    // Migrate all pending_review orders to draft
    const result = await Order.updateMany(
      { status: 'pending_review' },
      { status: 'draft' }
    );

    console.log(`✅ Migrated ${result.modifiedCount} orders from 'pending_review' to 'draft'`);

    // Verify migration
    const remainingPendingReview = await Order.countDocuments({ status: 'pending_review' });
    const draftOrders = await Order.countDocuments({ status: 'draft' });

    console.log(`\n📈 After migration:`);
    console.log(`   pending_review orders: ${remainingPendingReview}`);
    console.log(`   draft orders: ${draftOrders}`);

    console.log('\n✅ Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateOrders();
