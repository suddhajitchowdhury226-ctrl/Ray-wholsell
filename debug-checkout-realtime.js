const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔍 Real checkout এর পর কি হয়েছে সেটা চেক করছি...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  checkRecentCheckouts();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkRecentCheckouts() {
  try {
    console.log('\n📊 শেষ 1 ঘন্টার orders দেখছি...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentOrders = await Order.find({
      createdAt: { $gte: oneHourAgo }
    })
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 });

    console.log(`📋 শেষ 1 ঘন্টায় ${recentOrders.length}টি orders পাওয়া গেছে:`);
    
    if (recentOrders.length === 0) {
      console.log('❌ শেষ 1 ঘন্টায় কোন order নেই');
      
      // Check last 24 hours instead
      console.log('\n🔍 শেষ 24 ঘন্টার orders দেখছি...');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const last24Orders = await Order.find({
        createdAt: { $gte: twentyFourHoursAgo }
      })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
      
      console.log(`📋 শেষ 24 ঘন্টায় ${last24Orders.length}টি orders:`);
      
      last24Orders.forEach((order, index) => {
        const minutesAgo = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60));
        console.log(`\n${index + 1}. Order #${order.orderNumber}`);
        console.log(`   ⏰ ${minutesAgo} minutes ago`);
        console.log(`   👤 User: ${order.user?.name || 'N/A'} (${order.user?.email || order.userEmail})`);
        console.log(`   📧 Order Email: ${order.userEmail}`);
        console.log(`   💰 Total: $${order.total}`);
        console.log(`   📦 Status: ${order.status}`);
      });
    } else {
      recentOrders.forEach((order, index) => {
        const minutesAgo = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60));
        console.log(`\n${index + 1}. Order #${order.orderNumber}`);
        console.log(`   ⏰ ${minutesAgo} minutes ago`);
        console.log(`   👤 User: ${order.user?.name || 'N/A'} (${order.user?.email || order.userEmail})`);
        console.log(`   📧 Order Email: ${order.userEmail}`);
        console.log(`   💰 Total: $${order.total}`);
        console.log(`   📦 Status: ${order.status}`);
        
        // Check if this looks like a real user order
        if (!order.userEmail?.includes('test') && !order.orderNumber?.includes('TEST')) {
          console.log(`   🎯 এটা REAL USER ORDER! Email যাওয়া উচিত ছিল: ${order.userEmail}`);
        }
      });
    }

    // Check the most recent order in detail
    const latestOrder = await Order.findOne({}).sort({ createdAt: -1 }).populate('user');
    
    if (latestOrder) {
      console.log(`\n🔍 সবচেয়ে recent order এর details:`);
      console.log(`   📦 Order Number: ${latestOrder.orderNumber}`);
      console.log(`   📧 User Email: ${latestOrder.userEmail}`);
      console.log(`   📍 Delivery Email: ${latestOrder.deliveryAddress?.email}`);
      console.log(`   👤 User Object Email: ${latestOrder.user?.email}`);
      console.log(`   ⏰ Created: ${latestOrder.createdAt.toLocaleString('bn-BD')}`);
      
      const minutesAgo = Math.floor((Date.now() - latestOrder.createdAt.getTime()) / (1000 * 60));
      if (minutesAgo < 30) {
        console.log(`   🚨 এই order ${minutesAgo} মিনিট আগে হয়েছে - এটার email যাওয়া উচিত!`);
      }
    }

    console.log(`\n💡 Debugging Tips:`);
    console.log(`1. যদি আপনার order এই list এ নেই, তাহলে checkout process সম্পূর্ণ হয়নি`);
    console.log(`2. যদি order আছে কিন্তু email নেই, তাহলে email sending এ problem`);
    console.log(`3. Backend terminal এ 📧 emoji দিয়ে logs দেখুন`);

  } catch (error) {
    console.error('❌ Error checking recent checkouts:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}