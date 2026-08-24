const mongoose = require('mongoose');
const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');
const Order = require('./Models/orderModel');
const bcrypt = require('bcryptjs');
const { createOrderFromCart } = require('./Controllers/orderController');
require('dotenv').config();

console.log('🧪 Testing complete checkout flow with real user simulation...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ Connected to MongoDB');
  testCompleteCheckoutFlow();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testCompleteCheckoutFlow() {
  try {
    console.log('\n🔄 Step 1: Create/Find a test user with proper data...');
    
    const testEmail = 'realuser@test.com';
    const testPhone = Math.floor(Math.random() * 9000000000) + 1000000000; // Generate random 10-digit phone
    console.log('📞 Using phone:', testPhone);
    
    let testUser = await User.findOne({ email: testEmail });
    
    if (!testUser) {
      console.log('👤 Creating new test user...');
      testUser = new User({
        name: 'Real Test User',
        email: testEmail,
        phone: testPhone.toString(),
        role: 'wholesaler',
        password: await bcrypt.hash('password123', 12),
        isVerified: true,
        addresses: [{
          title: 'Home',
          name: 'Real Test User',
          contactNumber: testPhone.toString(),
          email: testEmail,
          addressLine1: '123 Real Street',
          addressLine2: 'Apartment 4B',
          city: 'Real City',
          state: 'Real State',
          country: 'United States',
          zipcode: '12345',
          isDefault: true
        }]
      });
      await testUser.save();
      console.log('✅ Test user created successfully');
    } else {
      console.log('👤 Using existing test user');
    }

    console.log('📧 User email:', testUser.email);
    console.log('📍 User addresses:', testUser.addresses.length);

    console.log('\n🔄 Step 2: Create cart with real products...');
    
    // Find actual products in the database
    const products = await Product.find({ stock: { $gt: 0 } }).limit(2);
    if (products.length === 0) {
      console.log('❌ No products found in database');
      return;
    }

    console.log(`📦 Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`   - ${product.name} (Stock: ${product.stock}, Price: $${product.buyPrice || product.sellPrice})`);
    });

    // Clear existing cart and create new one
    await Cart.findOneAndDelete({ user: testUser._id });
    
    const cartItems = products.map(product => ({
      product: product._id,
      quantity: 12, // Meet MOQ
      websiteRole: 'wholesaler'
    }));

    const cart = new Cart({
      user: testUser._id,
      items: cartItems
    });
    await cart.save();
    console.log('✅ Cart created with products');

    console.log('\n🔄 Step 3: Simulate checkout API call...');
    
    const mockReq = {
      user: { id: testUser._id.toString() },
      body: {
        addressId: testUser.addresses[0]._id.toString(),
        couponCode: null,
        notes: 'Complete flow test - should send email'
      }
    };

    let responseData = null;
    let responseStatus = null;

    const mockRes = {
      status: function(code) {
        responseStatus = code;
        console.log(`📤 Response Status: ${code}`);
        return this;
      },
      json: function(data) {
        responseData = data;
        console.log('📤 Response Data:', JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log('🚀 Calling createOrderFromCart with proper data...');
    console.log('📋 Request details:');
    console.log('   User ID:', mockReq.user.id);
    console.log('   Address ID:', mockReq.body.addressId);
    console.log('   Email:', testUser.email);

    // Call the actual controller function
    await createOrderFromCart(mockReq, mockRes);

    console.log('\n📊 CHECKOUT RESULT:');
    console.log('✅ Status:', responseStatus);
    console.log('📧 Message:', responseData?.message);
    
    if (responseStatus === 201) {
      console.log('🎉 ORDER CREATED SUCCESSFULLY!');
      console.log('📧 Check email inbox for:', testUser.email);
      console.log('📦 Order Number:', responseData?.order?.orderNumber);
      
      // Check if order exists in database
      const createdOrder = await Order.findOne({ orderNumber: responseData?.order?.orderNumber });
      if (createdOrder) {
        console.log('✅ Order confirmed in database');
        console.log('📧 Order email field:', createdOrder.userEmail);
      }
    } else {
      console.log('❌ ORDER CREATION FAILED');
      console.log('💡 Response message:', responseData?.message);
    }

  } catch (error) {
    console.error('❌ Error in complete checkout flow test:', error);
    console.error('❌ Stack trace:', error.stack);
  } finally {
    mongoose.connection.close();
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});