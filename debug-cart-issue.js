require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const userModel = require('./Models/user');
const productModel = require('./Models/productModel');
const cartModel = require('./Models/cartModel');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const debugAddToCart = async () => {
  await connectDB();

  console.log('\n=== DEBUGGING ADD TO CART ISSUE ===\n');

  // 1. Check if there are any users with role 'user'
  console.log('1️⃣ Checking for users with role "user"...');
  const users = await userModel.find({ role: 'user' }).limit(5);
  console.log(`   Found ${users.length} users`);
  if (users.length > 0) {
    console.log(`   Sample user: ${users[0].name} (${users[0].email}) ID: ${users[0]._id}`);
  } else {
    console.log('   ⚠️  No users found!');
  }

  // 2. Check if there are any products
  console.log('\n2️⃣ Checking for products...');
  const products = await productModel.find().limit(5);
  console.log(`   Found ${products.length} products in database`);
  if (products.length > 0) {
    const product = products[0];
    console.log(`   Sample product: ${product.name}`);
    console.log(`   Product ID: ${product._id}`);
    console.log(`   Stock: ${product.stock}`);
    console.log(`   Buy Price: ${product.buyPrice || 'N/A'}`);
    console.log(`   Sell Price: ${product.sellPrice || 'N/A'}`);
  } else {
    console.log('   ⚠️  No products found!');
  }

  // 3. Check if any carts exist
  console.log('\n3️⃣ Checking for existing carts...');
  const carts = await cartModel.find().populate('user', 'name email').populate('items.product', 'name');
  console.log(`   Found ${carts.length} carts in database`);
  if (carts.length > 0) {
    const cart = carts[0];
    console.log(`   Sample cart user: ${cart.user?.name || 'Unknown'}`);
    console.log(`   Items in cart: ${cart.items.length}`);
    if (cart.items.length > 0) {
      console.log(`   First item: ${cart.items[0].product?.name || 'Product not found'} (Qty: ${cart.items[0].quantity})`);
    }
  } else {
    console.log('   No carts exist yet');
  }

  // 4. Test add to cart functionality directly
  if (users.length > 0 && products.length > 0) {
    console.log('\n4️⃣ Testing add to cart directly...');
    const testUser = users[0];
    const testProduct = products[0];

    console.log(`   User: ${testUser.name} (ID: ${testUser._id})`);
    console.log(`   Product: ${testProduct.name} (ID: ${testProduct._id})`);

    try {
      // Check if cart exists
      let cart = await cartModel.findOne({ user: testUser._id });
      
      if (!cart) {
        console.log('   Creating new cart...');
        cart = new cartModel({
          user: testUser._id,
          items: [{
            product: testProduct._id,
            quantity: 1,
            websiteRole: 'wholesaler'
          }],
        });
        await cart.save();
        console.log('   ✅ New cart created successfully');
      } else {
        console.log('   Cart already exists, checking items...');
        const itemIndex = cart.items.findIndex(item =>
          item.product.toString() === testProduct._id.toString()
        );
        
        if (itemIndex > -1) {
          const oldQty = cart.items[itemIndex].quantity;
          cart.items[itemIndex].quantity += 1;
          console.log(`   ✅ Increased quantity from ${oldQty} to ${cart.items[itemIndex].quantity}`);
        } else {
          cart.items.push({
            product: testProduct._id,
            quantity: 1,
            websiteRole: 'wholesaler'
          });
          console.log('   ✅ Added new item to cart');
        }
        await cart.save();
      }

      // Fetch updated cart
      const updatedCart = await cartModel
        .findById(cart._id)
        .populate('items.product', 'name buyPrice sellPrice stock images')
        .populate('user', 'name email');

      console.log(`   Final cart items: ${updatedCart.items.length}`);
      console.log('   Cart items:');
      updatedCart.items.forEach((item, idx) => {
        console.log(`     ${idx + 1}. ${item.product?.name || 'Unknown'} x ${item.quantity}`);
      });
    } catch (error) {
      console.error('   ❌ Error testing add to cart:', error.message);
      console.error('   Full error:', error);
    }
  }

  // 5. Check backend server configuration
  console.log('\n5️⃣ Checking backend configuration...');
  console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
  console.log(`   BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'Set ✓' : 'Not set ✗'}`);

  // 6. Test backend API endpoint
  console.log('\n6️⃣ Testing backend API...');
  const backendURL = process.env.BASE_URL || 'http://api.rayonewholesale.com';
  console.log(`   Testing URL: ${backendURL}/api/user/categories`);
  
  try {
    const response = await axios.get(`${backendURL}/api/user/categories`, {
      timeout: 5000
    });
    console.log(`   ✅ Backend is responding (Status: ${response.status})`);
    console.log(`   Categories found: ${response.data?.categories?.length || response.data?.length || 0}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Backend is NOT running on this URL');
      console.log('   ⚠️  Make sure the backend server is started');
    } else if (error.code === 'ENOTFOUND') {
      console.log(`   ❌ Cannot resolve hostname: ${backendURL}`);
    } else if (error.response) {
      console.log(`   ⚠️  Backend responded with status: ${error.response.status}`);
    } else {
      console.log(`   ❌ Backend error: ${error.message}`);
    }
  }

  // 7. Check database indexes
  console.log('\n7️⃣ Checking database indexes...');
  try {
    const cartIndexes = await cartModel.collection.getIndexes();
    console.log('   Cart collection indexes:', Object.keys(cartIndexes).join(', '));

    const productIndexes = await productModel.collection.getIndexes();
    console.log('   Product collection indexes:', Object.keys(productIndexes).join(', '));

    const userIndexes = await userModel.collection.getIndexes();
    console.log('   User collection indexes:', Object.keys(userIndexes).join(', '));
  } catch (error) {
    console.log('   ⚠️  Could not fetch indexes:', error.message);
  }

  console.log('\n=== RECOMMENDATIONS ===\n');
  
  if (users.length === 0) {
    console.log('❌ Create at least one user with role "user" to test cart functionality');
  }
  
  if (products.length === 0) {
    console.log('❌ Add products to the database');
  }

  console.log('\n✅ Frontend should connect to: ' + backendURL);
  console.log('   Update your frontend .env file:');
  console.log(`   VITE_BASE_URL=${backendURL}`);

  console.log('\n=== DEBUG COMPLETE ===\n');
  
  mongoose.connection.close();
};

debugAddToCart().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
