/**
 * Find actual users in the database for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected!\n');
    
    console.log('Finding users with addresses...\n');
    
    const users = await User.find()
      .select('_id name email phone role addresses')
      .limit(10);
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. User ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Addresses: ${user.addresses ? user.addresses.length : 0}`);
      
      if (user.addresses && user.addresses.length > 0) {
        user.addresses.forEach((addr, addrIdx) => {
          console.log(`      ${addrIdx + 1}. ${addr.title || 'Untitled'} - ${addr.city}, ${addr.state}`);
        });
      }
      console.log();
    });
    
    // Try to find users with products in cart
    console.log('\n--- Checking for users with carts ---\n');
    
    const Cart = require('./Models/cartModel');
    const cartsWithItems = await Cart.find({ 'items.0': { $exists: true } })
      .select('user items')
      .limit(5);
    
    console.log(`Found ${cartsWithItems.length} users with items in cart:`);
    
    for (const cart of cartsWithItems) {
      console.log(`\nUser: ${cart.user}`);
      console.log(`Items in cart: ${cart.items.length}`);
    }
    
    console.log('\n--- Checking recent orders ---\n');
    
    const Order = require('./Models/orderModel');
    const recentOrders = await Order.find()
      .select('user orderNumber items total createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`Found ${recentOrders.length} recent orders:`);
    
    recentOrders.forEach((order, idx) => {
      console.log(`${idx + 1}. Order #${order.orderNumber} (User: ${order.user})`);
      console.log(`   Items: ${order.items.length}, Total: $${order.total}`);
      console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    process.exit(0);
  }
}

main();
