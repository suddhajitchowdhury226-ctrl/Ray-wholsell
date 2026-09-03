const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔍 Debugging debnathtulanka@gmail.com checkout...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  debugYourCheckout();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function debugYourCheckout() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Looking for user: ${yourEmail}`);
     
    // Find your user account
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found with email:', yourEmail);
      console.log('💡 Make sure you registered with this email address');
      
      // Check similar email addresses
      const similarUsers = await User.find({
        email: { $regex: 'debnath', $options: 'i' }
      }).select('name email');
      
      if (similarUsers.length > 0) {
        console.log('\n📋 Found similar email addresses:');
        similarUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.name || 'No Name'})`);
        });
      }
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name || 'No Name'} (${yourUser.email})`);
    console.log(`📱 Phone: ${yourUser.phone || 'N/A'}`);
    console.log(`👤 Role: ${yourUser.role}`);
    console.log(`✅ Verified: ${yourUser.isVerified}`);
    console.log(`📍 Addresses: ${yourUser.addresses?.length || 0}`);
    
    // Check for recent orders from this user
    console.log(`\n🛒 Checking recent orders from ${yourEmail}...`);
    
    const recentOrders = await Order.find({
      $or: [
        { user: yourUser._id },
        { userEmail: yourEmail },
        { 'deliveryAddress.email': yourEmail }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    if (recentOrders.length === 0) {
      console.log('❌ No orders found for this email address');
      console.log('💡 This means checkout is not completing successfully');
      
      // Check for very recent orders (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const veryRecentOrders = await Order.find({
        createdAt: { $gte: tenMinutesAgo }
      }).populate('user', 'email').sort({ createdAt: -1 });
      
      console.log(`\n🕐 Orders in last 10 minutes (any user):`);
      if (veryRecentOrders.length === 0) {
        console.log('❌ No orders at all in last 10 minutes');
        console.log('💡 Either checkout is failing or you haven\'t checked out yet');
      } else {
        veryRecentOrders.forEach((order, index) => {
          const minutesAgo = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. Order #${order.orderNumber}`);
          console.log(`      ⏰ ${minutesAgo} minutes ago`);
          console.log(`      📧 Email: ${order.userEmail || order.user?.email}`);
          console.log(`      💰 Total: $${order.total}`);
        });
      }
      
    } else {
      console.log(`✅ Found ${recentOrders.length} orders for ${yourEmail}:`);
      
      recentOrders.forEach((order, index) => {
        const minutesAgo = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60));
        console.log(`\n${index + 1}. Order #${order.orderNumber}`);
        console.log(`   ⏰ ${minutesAgo} minutes ago (${order.createdAt.toLocaleString()})`);
        console.log(`   📧 User Email: ${order.userEmail}`);
        console.log(`   📍 Delivery Email: ${order.deliveryAddress?.email}`);
        console.log(`   💰 Total: $${order.total}`);
        console.log(`   📦 Status: ${order.status}`);
        console.log(`   🛒 Items: ${order.items?.length || 0}`);
        
        if (minutesAgo <= 15) {
          console.log(`   🚨 RECENT ORDER! Email should have been sent to: ${order.userEmail}`);
        }
      });
    }
    
    // Check if there's an issue with the email field in user account
    console.log(`\n🔍 User account email validation:`);
    console.log(`   📧 Email in DB: "${yourUser.email}"`);
    console.log(`   📧 Email length: ${yourUser.email.length}`);
    console.log(`   📧 Email trim: "${yourUser.email.trim()}"`);
    console.log(`   ✅ Email match: ${yourUser.email === yourEmail}`);

  } catch (error) {
    console.error('❌ Error debugging checkout:', error);
  } finally {
    mongoose.connection.close();
    
    console.log('\n💡 DEBUGGING INSTRUCTIONS:');
    console.log('1. If no orders found: Checkout is not completing - check frontend errors');
    console.log('2. If orders found but no email: Email sending is failing during checkout');
    console.log('3. If recent order exists: Check spam folder for email from rayonewholesale@gmail.com');
    console.log('4. Check browser console for checkout errors');
    console.log('5. Check backend terminal for email sending logs during checkout');
    
    process.exit(0);
  }
}