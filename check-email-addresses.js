const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔍 সব recent orders এর email address চেক করছি...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB এ connected');
  checkEmailAddresses();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkEmailAddresses() {
  try {
    console.log('\n📊 সব recent orders দেখছি (শেষ 10টি)...');
    
    // Get the most recent 10 orders
    const recentOrders = await Order.find({})
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentOrders.length === 0) {
      console.log('❌ কোন order পাওয়া যায়নি');
      return;
    }

    console.log(`\n📋 মোট ${recentOrders.length}টি recent orders পাওয়া গেছে:\n`);
    
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order #${order.orderNumber}`);
      console.log(`   📅 তারিখ: ${new Date(order.createdAt).toLocaleString('bn-BD')}`);
      console.log(`   👤 User: ${order.user?.name || 'N/A'} (${order.user?.email || 'N/A'})`);
      console.log(`   📧 Order Email Field: ${order.userEmail || 'N/A'}`);
      console.log(`   📍 Delivery Address Email: ${order.deliveryAddress?.email || 'N/A'}`);
      console.log(`   💰 Total: $${order.total}`);
      console.log(`   📦 Status: ${order.status}`);
      console.log(`   ──────────────────────────────────────`);
    });

    // Check unique email addresses
    console.log('\n📧 সব unique email addresses যেখানে orders গেছে:');
    
    const emailAddresses = new Set();
    
    recentOrders.forEach(order => {
      if (order.userEmail) emailAddresses.add(order.userEmail);
      if (order.user?.email) emailAddresses.add(order.user.email);
      if (order.deliveryAddress?.email) emailAddresses.add(order.deliveryAddress.email);
    });

    Array.from(emailAddresses).forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
    });

    // Check if there are any real user orders (not test orders)
    console.log('\n🔍 Real user orders vs Test orders:');
    
    let testOrders = 0;
    let realOrders = 0;
    
    recentOrders.forEach(order => {
      const email = order.userEmail || order.user?.email || '';
      if (email.includes('test') || email.includes('example') || order.orderNumber.includes('TEST')) {
        testOrders++;
      } else {
        realOrders++;
        console.log(`   📧 Real order: ${order.orderNumber} → ${email}`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   🧪 Test Orders: ${testOrders}`);
    console.log(`   👤 Real User Orders: ${realOrders}`);

    // Check configured email sender
    console.log(`\n📤 Email sender configured:`);
    console.log(`   From: ${process.env.EMAIL_USER || 'Not configured'}`);
    console.log(`   Password: ${process.env.EMAIL_PASS ? 'Configured' : 'Not configured'}`);

    console.log('\n💡 যদি real user orders থাকে, তাহলে emails সেই addresses এ গেছে।');
    console.log('💡 User দের বলুন spam/junk folder চেক করতে।');
    console.log('💡 Email address: rayonewholesale@gmail.com থেকে email আসবে।');

  } catch (error) {
    console.error('❌ Error checking email addresses:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}