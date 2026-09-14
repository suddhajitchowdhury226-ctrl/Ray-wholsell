const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./Models/orderModel');

async function checkOrderStatuses() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Fetching all orders...');
    const orders = await Order.find({})
      .select('_id orderNumber status createdAt userEmail')
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`\n✅ Found ${orders.length} recent orders:\n`);
    
    const statusCounts = {};
    
    orders.forEach((order, i) => {
      console.log(`${i + 1}. Order #${order.orderNumber}`);
      console.log(`   ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Email: ${order.userEmail}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('');
      
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    console.log('\n📈 Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} orders`);
    });

    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOrderStatuses();
