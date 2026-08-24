const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    const pendingOrders = await Order.find({ status: 'pending_review' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    console.log(`\n📋 PENDING REVIEW ORDERS: ${pendingOrders.length} found\n`);
    
    pendingOrders.forEach((order, index) => {
      console.log(`${index + 1}. ORDER ${order.orderNumber || order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Buyer: ${order.user?.name || 'Unknown'}`);
      console.log(`   Email: ${order.userEmail || order.user?.email || 'Unknown'}`);
      console.log(`   Total: $${order.total.toFixed(2)}`);
      console.log(`   Items: ${order.items.length}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('   ---');
    });

    const allOrders = await Order.countDocuments();
    console.log(`\n📊 TOTAL ORDERS IN DATABASE: ${allOrders}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrders();