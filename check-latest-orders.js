const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔍 Checking for very recent orders from debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  checkLatestOrders();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkLatestOrders() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    // Check orders in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    console.log(`\n🕐 Checking orders since: ${fiveMinutesAgo.toLocaleString()}`);
    
    const veryRecentOrders = await Order.find({
      $or: [
        { userEmail: yourEmail },
        { 'deliveryAddress.email': yourEmail }
      ],
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${veryRecentOrders.length} orders in last 5 minutes for ${yourEmail}`);

    if (veryRecentOrders.length === 0) {
      console.log('❌ No new orders found in last 5 minutes');
      
      // Check ALL recent orders for this email
      const allYourOrders = await Order.find({
        $or: [
          { userEmail: yourEmail },
          { 'deliveryAddress.email': yourEmail }
        ]
      }).sort({ createdAt: -1 });
      
      console.log(`\n📊 ALL orders for ${yourEmail}:`);
      allYourOrders.forEach((order, index) => {
        const minutesAgo = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60));
        console.log(`${index + 1}. Order #${order.orderNumber} - ${minutesAgo} minutes ago`);
      });
      
    } else {
      veryRecentOrders.forEach((order, index) => {
        const secondsAgo = Math.floor((Date.now() - order.createdAt.getTime()) / 1000);
        console.log(`\n${index + 1}. 🚨 NEW ORDER #${order.orderNumber}`);
        console.log(`   ⏰ ${secondsAgo} seconds ago`);
        console.log(`   📧 User Email: ${order.userEmail}`);
        console.log(`   📍 Delivery Email: ${order.deliveryAddress?.email}`);
        console.log(`   💰 Total: $${order.total}`);
        console.log(`   📦 Status: ${order.status}`);
        console.log(`   🛒 Items: ${order.items?.length} products`);
      });
    }
    
    // Also check if there are ANY orders in last 5 minutes from anyone
    console.log(`\n🌐 ALL orders from ANY user in last 5 minutes:`);
    const allRecentOrders = await Order.find({
      createdAt: { $gte: fiveMinutesAgo }
    }).populate('user', 'email name').sort({ createdAt: -1 });
    
    if (allRecentOrders.length === 0) {
      console.log('❌ No orders at all in last 5 minutes - checkout might not be working');
    } else {
      allRecentOrders.forEach((order, index) => {
        const secondsAgo = Math.floor((Date.now() - order.createdAt.getTime()) / 1000);
        console.log(`${index + 1}. Order #${order.orderNumber}`);
        console.log(`   ⏰ ${secondsAgo} seconds ago`);
        console.log(`   👤 User: ${order.user?.email || order.userEmail}`);
        console.log(`   💰 Total: $${order.total}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    mongoose.connection.close();
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. If no new orders: Checkout is failing - check browser console');
    console.log('2. If new order found: Email should have been sent');
    console.log('3. Check backend terminal during checkout for email logs');
    console.log('4. Make sure you\'re using production frontend (not demo mode)');
    
    process.exit(0);
  }
}