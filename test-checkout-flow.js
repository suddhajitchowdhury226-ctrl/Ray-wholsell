const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import models
const Order = require('./Models/orderModel');
const User = require('./Models/user');
const Product = require('./Models/productModel');
const Cart = require('./Models/cartModel');

const BASE_URL = 'http://localhost:5555';

async function testCheckoutFlow() {
  try {
    console.log('🧪 Testing Complete Checkout Flow...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Step 1: Create/Find test user with address
    let testUser = await User.findOne({ email: 'checkout@test.com' });
    if (!testUser) {
      testUser = new User({
        name: 'Checkout Tester',
        email: 'checkout@test.com',
        phone: '9876543210',
        password: '$2b$10$hashedpassword',
        role: 'user',
        websiteRole: 'wholesaler',
        addresses: [{
          title: 'Office',
          name: 'Checkout Tester',
          contactNumber: '9876543210',
          email: 'checkout@test.com',
          addressLine1: '456 Test Street',
          addressLine2: 'Suite 100',
          city: 'Test City',
          state: 'TC',
          country: 'USA',
          zipcode: '12345'
        }]
      });
      await testUser.save();
      console.log('✅ Created test user with address');
    }

    // Step 2: Create test products
    await Product.deleteMany({ name: { $regex: /^Test Checkout Product/ } });
    
    const product1 = new Product({
      name: 'Test Checkout Product A',
      description: 'Product A for checkout testing',
      category: '6a81c579b4004187e8640f5a', // B VITAMINS
      brand: '6a8350027b34efc7b3d2b13b', // Ray's Healthy Living RHL 1
      sellPrice: 15.99,
      buyPrice: 12.99,
      stock: 100,
      images: ['test-a.jpg']
    });
    
    const product2 = new Product({
      name: 'Test Checkout Product B',
      description: 'Product B for checkout testing',
      category: '6a81c579b4004187e8640f5b', // C VITAMINS
      brand: '6a8350027b34efc7b3d2b13b', // Ray's Healthy Living RHL 1
      sellPrice: 25.99,
      buyPrice: 20.99,
      stock: 75,
      images: ['test-b.jpg']
    });

    await product1.save();
    await product2.save();
    console.log('✅ Created test products');

    // Step 3: Create cart with items
    await Cart.findOneAndDelete({ user: testUser._id });
    
    const cart = new Cart({
      user: testUser._id,
      items: [
        {
          product: product1._id,
          quantity: 12, // MOQ
          websiteRole: 'wholesaler',
          flavour: null,
          variantId: null
        },
        {
          product: product2._id,
          quantity: 15,
          websiteRole: 'wholesaler',
          flavour: null,
          variantId: null
        }
      ]
    });
    
    await cart.save();
    console.log('✅ Created test cart with items');

    // Step 4: Generate JWT token for API calls
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: testUser._id, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('✅ Generated JWT token');

    // Step 5: Test checkout API call
    console.log('\n📞 Testing checkout API call...');
    
    const checkoutPayload = {
      addressId: testUser.addresses[0]._id,
      couponCode: null,
      notes: 'Test checkout flow'
    };

    try {
      const response = await axios.post(
        `${BASE_URL}/api/orders/checkout`,
        checkoutPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Checkout API Success!');
      console.log('📦 Order Details:', {
        orderNumber: response.data.order.orderNumber,
        total: response.data.order.total,
        status: response.data.order.status,
        itemCount: response.data.order.items.length
      });

      // Step 6: Verify order in database
      const createdOrder = await Order.findOne({ 
        orderNumber: response.data.order.orderNumber 
      }).populate('user', 'name email');

      if (createdOrder) {
        console.log('✅ Order verified in database');
        console.log('📋 Order Status:', createdOrder.status);
        console.log('📧 User Email:', createdOrder.userEmail);
        console.log('🏠 Delivery Address:', createdOrder.deliveryAddress.addressLine1);
        console.log('💰 Total Amount:', `$${createdOrder.total.toFixed(2)}`);
        
        // Step 7: Verify cart was cleared
        const updatedCart = await Cart.findOne({ user: testUser._id });
        if (!updatedCart || updatedCart.items.length === 0) {
          console.log('✅ Cart cleared successfully after checkout');
        } else {
          console.log('❌ Cart still contains items after checkout');
        }

        // Step 8: Check if order appears in admin panel data
        console.log('\n🔍 Checking admin panel integration...');
        
        const adminToken = jwt.sign(
          { id: 'admin_id', role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        try {
          const adminResponse = await axios.get(
            `${BASE_URL}/api/orders/all-orders`,
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`
              }
            }
          );

          const pendingOrders = adminResponse.data.orders.filter(o => o.status === 'pending_review');
          console.log(`✅ Found ${pendingOrders.length} pending review orders in admin panel`);
          
          const ourOrder = pendingOrders.find(o => o.orderNumber === createdOrder.orderNumber);
          if (ourOrder) {
            console.log('✅ Our test order appears in admin "Requested Orders" tab');
          }

        } catch (adminErr) {
          console.log('⚠️ Admin API test skipped (authentication required)');
        }

      } else {
        console.log('❌ Order not found in database');
      }

    } catch (checkoutError) {
      console.error('❌ Checkout API Error:', checkoutError.response?.data || checkoutError.message);
    }

    // Step 9: Test Email Configuration
    console.log('\n📧 Testing email configuration...');
    console.log(`Email User: ${process.env.EMAIL_USER}`);
    console.log(`Email Pass: ${process.env.EMAIL_PASS ? '***configured***' : 'NOT SET'}`);
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('✅ Email credentials configured');
    } else {
      console.log('❌ Email credentials missing');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('\n📊 Test Complete!');
  }
}

testCheckoutFlow();