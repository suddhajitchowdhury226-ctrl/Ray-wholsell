const mongoose = require('mongoose');
const Product = require('./Models/productModel');
const Cart = require('./Models/cartModel');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔍 Checking product IDs to identify demo mode issue...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  checkProductIDs();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkProductIDs() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    // Find your user
    const yourUser = await User.findOne({ email: yourEmail });
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`\n👤 User: ${yourUser.name} (${yourUser.email})`);
    
    // Check your current cart
    const yourCart = await Cart.findOne({ user: yourUser._id }).populate('items.product', '_id name');
    
    if (!yourCart || yourCart.items.length === 0) {
      console.log('🛒 Cart is empty');
    } else {
      console.log(`\n🛒 Current cart (${yourCart.items.length} items):`);
      
      yourCart.items.forEach((item, index) => {
        const productId = item.product._id.toString();
        const isDemoMode = productId.startsWith('64a7b8c9d1e2f3a4b5c6d7');
        
        console.log(`${index + 1}. ${item.product.name}`);
        console.log(`   📦 Product ID: ${productId}`);
        console.log(`   🎮 Demo Mode: ${isDemoMode ? 'YES - This triggers demo mode!' : 'NO - Real API mode'}`);
        console.log(`   🔢 Quantity: ${item.quantity}`);
      });
    }
    
    // Check all products in database
    console.log(`\n📊 Product ID analysis:`);
    
    const allProducts = await Product.find({}).select('_id name').limit(10);
    console.log(`\n📦 Sample products in database:`);
    
    allProducts.forEach((product, index) => {
      const productId = product._id.toString();
      const isDemoMode = productId.startsWith('64a7b8c9d1e2f3a4b5c6d7');
      
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   📦 ID: ${productId}`);
      console.log(`   🎮 Demo Mode: ${isDemoMode ? 'YES' : 'NO'}`);
    });
    
    // Check the demo mode pattern
    console.log(`\n🎮 DEMO MODE ANALYSIS:`);
    console.log(`Demo mode triggers when product ID starts with: '64a7b8c9d1e2f3a4b5c6d7'`);
    
    const demoProducts = await Product.find({ _id: { $regex: /^64a7b8c9d1e2f3a4b5c6d7/ } });
    console.log(`📊 Products that trigger demo mode: ${demoProducts.length}`);
    
    if (demoProducts.length > 0) {
      console.log(`\n🎮 Demo mode products:`);
      demoProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product._id})`);
      });
    }
    
    // Solution
    console.log(`\n💡 SOLUTION:`);
    if (yourCart && yourCart.items.length > 0) {
      const hasDemo = yourCart.items.some(item => 
        item.product._id.toString().startsWith('64a7b8c9d1e2f3a4b5c6d7')
      );
      
      if (hasDemo) {
        console.log(`❌ Your cart contains demo mode products!`);
        console.log(`🔧 This is why checkout doesn't call real API`);
        console.log(`📝 Need to change product IDs or remove demo mode check`);
      } else {
        console.log(`✅ Your cart has real products - should call API`);
        console.log(`🔍 Check if frontend is using cached demo products`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking product IDs:', error);
  } finally {
    mongoose.connection.close();
    
    console.log('\n🔧 FIX OPTIONS:');
    console.log('1. Remove demo mode check from frontend');
    console.log('2. Use products with different IDs');
    console.log('3. Clear localStorage and add fresh products');
    
    process.exit(0);
  }
}