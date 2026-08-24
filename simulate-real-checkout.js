const mongoose = require('mongoose');
const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');
const { createOrderFromCart } = require('./Controllers/orderController');
require('dotenv').config();

console.log('🛒 Real user checkout simulation চালাচ্ছি...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  simulateRealCheckout();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function simulateRealCheckout() {
  try {
    console.log('\n🔍 Real user দিয়ে checkout test করছি...');
    
    // Find a real user (not test user) 
    const realUser = await User.findOne({
      email: { $not: /test|example|demo/i },
      isVerified: true
    }).populate('addresses');
    
    if (!realUser) {
      console.log('❌ কোন real user পাওয়া যায়নি');
      return;
    }
    
    console.log(`👤 Real User পাওয়া গেছে: ${realUser.name} (${realUser.email})`);
    
    // Check if user has address
    if (!realUser.addresses || realUser.addresses.length === 0) {
      console.log('📍 User এর কোন address নেই, একটি add করছি...');
      
      realUser.addresses.push({
        title: 'Home',
        name: realUser.name,
        contactNumber: realUser.phone || '1234567890',
        email: realUser.email,
        addressLine1: '123 Test Address',
        addressLine2: '',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        zipcode: '1000',
        isDefault: true
      });
      
      await realUser.save();
      console.log('✅ Address added');
    }
    
    // Find products for cart
    const products = await Product.find({ stock: { $gt: 0 } }).limit(2);
    if (products.length === 0) {
      console.log('❌ কোন products পাওয়া যায়নি');
      return;
    }
    
    console.log(`📦 Products পাওয়া গেছে: ${products.length}টি`);
    
    // Clear existing cart and create new one
    await Cart.findOneAndDelete({ user: realUser._id });
    
    const cartItems = products.map(product => ({
      product: product._id,
      quantity: 12, // Meet MOQ
      websiteRole: realUser.role === 'wholesaler' ? 'wholesaler' : 'retailer'
    }));

    const cart = new Cart({
      user: realUser._id,
      items: cartItems
    });
    await cart.save();
    
    console.log('🛒 Cart created successfully');
    
    // Now simulate checkout
    console.log('\n🚀 Checkout simulation শুরু করছি...');
    console.log(`📧 Email যাবে: ${realUser.email}`);
    
    const mockReq = {
      user: { id: realUser._id.toString() },
      body: {
        addressId: realUser.addresses[0]._id.toString(),
        couponCode: null,
        notes: 'Real checkout test - Email should be sent'
      }
    };

    let emailSent = false;
    let orderCreated = false;
    let responseMessage = '';

    const mockRes = {
      status: function(code) {
        console.log(`📤 Response Status: ${code}`);
        if (code === 201) {
          orderCreated = true;
        }
        return this;
      },
      json: function(data) {
        responseMessage = data.message;
        console.log('📤 Response:', data.message);
        console.log('📦 Order Number:', data.order?.orderNumber);
        return this;
      }
    };

    // Call the checkout controller
    console.log('🔥 Calling checkout controller...');
    
    // Override console.log temporarily to capture email logs
    const originalConsoleLog = console.log;
    let emailLogFound = false;
    
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('📧') && message.includes('sent successfully')) {
        emailSent = true;
        emailLogFound = true;
      }
      originalConsoleLog.apply(console, args);
    };
    
    try {
      await createOrderFromCart(mockReq, mockRes);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
    
    console.log('\n📊 CHECKOUT RESULT SUMMARY:');
    console.log(`✅ Order Created: ${orderCreated ? 'YES' : 'NO'}`);
    console.log(`📧 Email Sent: ${emailSent ? 'YES' : 'NO'}`);
    console.log(`📩 Target Email: ${realUser.email}`);
    console.log(`💬 Response: ${responseMessage}`);
    
    if (orderCreated && emailSent) {
      console.log('\n🎉 SUCCESS! Order created এবং email sent!');
      console.log(`📧 এখন ${realUser.email} এই address এ email চেক করুন`);
      console.log('📁 Inbox, Spam/Junk, এবং Promotions folder দেখুন');
    } else if (orderCreated && !emailSent) {
      console.log('\n⚠️  Order created কিন্তু email sent হয়নি!');
      console.log('🔍 Email sending এ problem আছে');
    } else {
      console.log('\n❌ Checkout failed!');
    }

  } catch (error) {
    console.error('❌ Error in checkout simulation:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}