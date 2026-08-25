const mongoose = require('mongoose');
const User = require('./Models/user');
const Order = require('./Models/orderModel');
require('dotenv').config();

console.log('🔍 Real users এর email addresses চেক করছি...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB এ connected');
  checkRealUsers();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkRealUsers() {
  try {
    console.log('\n👥 সব registered users দেখছি...');
    
    // Get all users (excluding test users)
    const allUsers = await User.find({
      email: { $not: /test|example|demo|admin/i }
    }).select('name email phone role createdAt isVerified').sort({ createdAt: -1 }).limit(20);

    if (allUsers.length === 0) {
      console.log('❌ কোন real user পাওয়া যায়নি');
    } else {
      console.log(`\n📋 ${allUsers.length}টি real users পাওয়া গেছে:\n`);
      
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'No Name'}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   📱 Phone: ${user.phone || 'N/A'}`);
        console.log(`   👤 Role: ${user.role}`);
        console.log(`   ✅ Verified: ${user.isVerified ? 'Yes' : 'No'}`);
        console.log(`   📅 Joined: ${new Date(user.createdAt).toLocaleString('bn-BD')}`);
        console.log(`   ──────────────────────────────────────`);
      });
    }

    // Also check admin users
    console.log('\n👑 Admin users:');
    const adminUsers = await User.find({ role: 'admin' }).select('name email phone createdAt');
    
    if (adminUsers.length > 0) {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name || 'No Name'}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   📱 Phone: ${admin.phone || 'N/A'}`);
        console.log(`   📅 Created: ${new Date(admin.createdAt).toLocaleString('bn-BD')}`);
      });
    }

    // Check if any real user has made orders
    console.log('\n🛒 Real user orders check...');
    const realUserEmails = allUsers.map(user => user.email);
    
    if (realUserEmails.length > 0) {
      const realUserOrders = await Order.find({
        $or: [
          { userEmail: { $in: realUserEmails } },
          { 'deliveryAddress.email': { $in: realUserEmails } }
        ]
      }).populate('user', 'name email').sort({ createdAt: -1 });

      if (realUserOrders.length > 0) {
        console.log(`\n📦 ${realUserOrders.length}টি real user orders পাওয়া গেছে:`);
        realUserOrders.forEach((order, index) => {
          console.log(`${index + 1}. Order #${order.orderNumber}`);
          console.log(`   📧 Email: ${order.userEmail}`);
          console.log(`   📅 Date: ${new Date(order.createdAt).toLocaleString('bn-BD')}`);
          console.log(`   💰 Total: $${order.total}`);
        });
      } else {
        console.log('❌ কোন real user order পাওয়া যায়নি');
      }
    }

    // Check most recent orders from ANY users
    console.log('\n🕐 সবচেয়ে recent orders (সব users):');
    const latestOrders = await Order.find({})
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    latestOrders.forEach((order, index) => {
      const isTestOrder = order.userEmail?.includes('test') || 
                         order.userEmail?.includes('example') || 
                         order.orderNumber?.includes('TEST');
      
      console.log(`${index + 1}. ${isTestOrder ? '🧪 TEST' : '👤 REAL'} Order #${order.orderNumber}`);
      console.log(`   📧 Email যেখানে email গেছে: ${order.userEmail}`);
      console.log(`   📅 Time: ${new Date(order.createdAt).toLocaleString('bn-BD')}`);
      console.log(`   💰 Amount: $${order.total}`);
    });

  } catch (error) {
    console.error('❌ Error checking real users:', error);
  } finally {
    mongoose.connection.close();
    
    console.log('\n📧 EMAIL INFO:');
    console.log('✉️  Sender email: rayonewholesale@gmail.com');
    console.log('📨 Users should check:');
    console.log('   1. Inbox folder');
    console.log('   2. Spam/Junk folder');
    console.log('   3. Promotions tab (Gmail)');
    console.log('   4. All mail folder');
    
    process.exit(0);
  }
}