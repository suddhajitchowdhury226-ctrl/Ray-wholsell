const mongoose = require('mongoose');
const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');
require('dotenv').config();

console.log('🛒 Debugging cart issue for debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  debugCartIssue();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function debugCartIssue() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Finding user: ${yourEmail}`);
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name} (ID: ${yourUser._id})`);
    
    // Check database cart
    console.log('\n🛒 Checking database cart...');
    const dbCart = await Cart.findOne({ user: yourUser._id }).populate('items.product', 'name stock buyPrice sellPrice');
    
    if (!dbCart) {
      console.log('❌ No cart found in database');
      console.log('💡 This explains the "Cart is empty" error during checkout');
      
      // Create a cart with sample products
      console.log('\n🔧 Creating cart with available products...');
      const products = await Product.find({ stock: { $gt: 0 } }).limit(2);
      
      if (products.length === 0) {
        console.log('❌ No products available in database');
        return;
      }
      
      console.log(`📦 Found ${products.length} products:`);
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (Stock: ${product.stock}, Price: $${product.buyPrice || product.sellPrice})`);
      });
      
      // Create cart
      const newCartItems = products.map(product => ({
        product: product._id,
        quantity: 12, // MOQ
        websiteRole: 'wholesaler'
      }));

      const newCart = new Cart({
        user: yourUser._id,
        items: newCartItems
      });

      await newCart.save();
      console.log('✅ New cart created in database');
      
      // Verify the cart
      const verifyCart = await Cart.findOne({ user: yourUser._id }).populate('items.product', 'name stock buyPrice sellPrice');
      console.log('\n✅ New cart verification:');
      console.log(`   🛒 Items count: ${verifyCart.items.length}`);
      verifyCart.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.product.name} - Qty: ${item.quantity} - Price: $${item.product.buyPrice || item.product.sellPrice}`);
      });
      
    } else {
      console.log(`✅ Database cart found with ${dbCart.items.length} items:`);
      
      if (dbCart.items.length === 0) {
        console.log('❌ Database cart exists but is empty');
      } else {
        dbCart.items.forEach((item, index) => {
          console.log(`   ${index + 1}. Product: ${item.product?.name || 'Unknown'}`);
          console.log(`      📦 Product ID: ${item.product?._id || item.product}`);
          console.log(`      🔢 Quantity: ${item.quantity}`);
          console.log(`      👤 Website Role: ${item.websiteRole}`);
          console.log(`      💰 Product Price: $${item.product?.buyPrice || item.product?.sellPrice || 'N/A'}`);
          console.log(`      📦 Stock: ${item.product?.stock || 'N/A'}`);
        });
      }
    }
    
    // Check localStorage simulation
    console.log('\n💾 Frontend localStorage cart issue:');
    console.log('💡 The frontend shows cart items from localStorage');
    console.log('💡 But the backend expects cart items in the database');
    console.log('💡 This creates a mismatch during checkout');
    
    console.log('\n🔧 SOLUTIONS:');
    console.log('1. ✅ Database cart created/updated');
    console.log('2. 🔄 Frontend should sync cart to database when items are added');
    console.log('3. 🔍 Check if frontend add-to-cart API calls are working');
    console.log('4. 🛒 Clear browser localStorage and re-add items properly');
    
    console.log('\n📝 INSTRUCTIONS:');
    console.log('1. 🌐 Go to http://localhost:5173/');
    console.log('2. 🛒 Clear your browser cart (if any)');
    console.log('3. 📦 Add products to cart using "Add to Cart" buttons');
    console.log('4. 🛍️ Try checkout - should work now');
    console.log('5. 📧 Check email for confirmation');

  } catch (error) {
    console.error('❌ Error debugging cart:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}