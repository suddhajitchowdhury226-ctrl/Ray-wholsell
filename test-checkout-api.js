const mongoose = require('mongoose');
const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');
const { createOrderFromCart } = require('./Controllers/orderController');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ Connected to MongoDB');
  testCheckoutAPI();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testCheckoutAPI() {
  try {
    console.log('🧪 Testing checkout API with actual database...');

    // Find a test user
    const testUser = await User.findOne({ email: { $exists: true } }).populate('addresses');
    if (!testUser) {
      console.log('❌ No user found in database');
      return;
    }

    console.log('👤 Found test user:', testUser.email);
    console.log('📍 User has', testUser.addresses?.length || 0, 'addresses');

    // Find a test product
    const testProduct = await Product.findOne({ stock: { $gt: 0 } });
    if (!testProduct) {
      console.log('❌ No product found in database');
      return;
    }

    console.log('📦 Found test product:', testProduct.name);

    // Create or update cart with test items
    const cartData = {
      user: testUser._id,
      items: [
        {
          product: testProduct._id,
          quantity: 12, // MOQ
          websiteRole: 'wholesaler'
        }
      ]
    };

    await Cart.findOneAndUpdate(
      { user: testUser._id },
      cartData,
      { upsert: true, new: true }
    );

    console.log('🛒 Cart created/updated with test items');

    // Ensure user has an address
    let addressId;
    if (testUser.addresses && testUser.addresses.length > 0) {
      addressId = testUser.addresses[0]._id;
      console.log('📍 Using existing address:', testUser.addresses[0].addressLine1);
    } else {
      // Create a test address
      testUser.addresses.push({
        title: 'Test Address',
        name: 'Test Customer',
        contactNumber: '1234567890',
        email: testUser.email,
        addressLine1: '123 Test Street',
        addressLine2: '',
        city: 'Test City',
        state: 'Test State',
        country: 'United States',
        zipcode: '12345',
        isDefault: true
      });
      
      // Ensure user has required fields
      if (!testUser.phone) {
        testUser.phone = '1234567890'; // Must be exactly 10 digits
      }
      if (!testUser.name) {
        testUser.name = 'Test Customer';
      }
      
      try {
        await testUser.save();
        addressId = testUser.addresses[0]._id;
        console.log('📍 Created test address and updated user info');
      } catch (saveError) {
        // If there's a duplicate phone error, just use the existing user data
        if (saveError.code === 11000) {
          console.log('⚠️ User already has required data, using existing info');
          addressId = testUser.addresses[0]._id;
        } else {
          throw saveError;
        }
      }
    }

    // Mock request and response objects
    const mockReq = {
      user: { id: testUser._id.toString() },
      body: {
        addressId: addressId.toString(),
        couponCode: null,
        notes: 'Test checkout via API script'
      }
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        console.log('📤 Response status:', code);
        return this;
      },
      json: function(data) {
        console.log('📤 Response data:', JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log('🚀 Calling createOrderFromCart...');
    console.log('📋 Request payload:', {
      userId: mockReq.user.id,
      addressId: mockReq.body.addressId,
      couponCode: mockReq.body.couponCode,
      notes: mockReq.body.notes
    });

    // Call the actual controller function
    await createOrderFromCart(mockReq, mockRes);

    console.log('✅ Checkout API test completed');

  } catch (error) {
    console.error('❌ Error in checkout API test:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}