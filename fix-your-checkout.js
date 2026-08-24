const mongoose = require('mongoose');
const User = require('./Models/user');
require('dotenv').config();

console.log('🔧 Fixing checkout issue for debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  fixYourAccount();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function fixYourAccount() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Finding user: ${yourEmail}`);
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name}`);
    console.log(`📍 Current addresses: ${yourUser.addresses?.length || 0}`);
    
    if (!yourUser.addresses || yourUser.addresses.length === 0) {
      console.log('\n🔧 Adding default address for checkout...');
      
      yourUser.addresses = [{
        title: 'Home',
        name: yourUser.name || 'Tulanka Debnath',
        contactNumber: yourUser.phone || '9134465309',
        email: yourUser.email,
        addressLine1: 'Default Address Line 1',
        addressLine2: 'Default Address Line 2', 
        city: 'Dhaka',
        state: 'Dhaka Division',
        country: 'Bangladesh',
        zipcode: '1000',
        isDefault: true
      }];
      
      await yourUser.save();
      console.log('✅ Default address added successfully');
      console.log(`📍 Address ID: ${yourUser.addresses[0]._id}`);
    } else {
      console.log('✅ User already has addresses');
    }
    
    // Now test checkout with this user
    console.log('\n🧪 Testing checkout process...');
    
    // Import required modules for checkout test
    const Cart = require('./Models/cartModel');
    const Product = require('./Models/productModel');
    const { createOrderFromCart } = require('./Controllers/orderController');
    
    // Find products
    const products = await Product.find({ stock: { $gt: 0 } }).limit(2);
    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    console.log(`📦 Found ${products.length} products for cart`);
    
    // Clear and create cart
    await Cart.findOneAndDelete({ user: yourUser._id });
    
    const cartItems = products.map(product => ({
      product: product._id,
      quantity: 12,
      websiteRole: 'wholesaler'
    }));

    const cart = new Cart({
      user: yourUser._id,
      items: cartItems
    });
    await cart.save();
    
    console.log('🛒 Cart created with products');
    
    // Simulate checkout
    console.log('\n🚀 Simulating checkout...');
    
    const mockReq = {
      user: { id: yourUser._id.toString() },
      body: {
        addressId: yourUser.addresses[0]._id.toString(),
        couponCode: null,
        notes: 'Test checkout for debnathtulanka@gmail.com - should send email'
      }
    };

    let checkoutSuccess = false;
    let emailSent = false;
    let orderNumber = null;

    const mockRes = {
      status: function(code) {
        console.log(`📤 Response Status: ${code}`);
        if (code === 201) checkoutSuccess = true;
        return this;
      },
      json: function(data) {
        console.log(`📤 Response Message: ${data.message}`);
        if (data.order?.orderNumber) {
          orderNumber = data.order.orderNumber;
        }
        return this;
      }
    };

    // Override console.log to catch email logs
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('📧') && message.includes('sent successfully')) {
        emailSent = true;
      }
      originalLog.apply(console, args);
    };

    try {
      await createOrderFromCart(mockReq, mockRes);
    } finally {
      console.log = originalLog;
    }
    
    console.log('\n📊 CHECKOUT TEST RESULTS:');
    console.log(`✅ Checkout Success: ${checkoutSuccess ? 'YES' : 'NO'}`);
    console.log(`📧 Email Sent: ${emailSent ? 'YES' : 'NO'}`);
    console.log(`📦 Order Number: ${orderNumber || 'N/A'}`);
    console.log(`📧 Target Email: ${yourEmail}`);
    
    if (checkoutSuccess && emailSent) {
      console.log('\n🎉 SUCCESS! Checkout এবং email দুটোই কাজ করছে!');
      console.log(`📧 এখন ${yourEmail} এ email চেক করুন`);
      console.log('📁 Inbox, Spam/Junk, এবং Promotions tab দেখুন');
    } else if (checkoutSuccess && !emailSent) {
      console.log('\n⚠️  Checkout successful কিন্তু email sent হয়নি');
    } else {
      console.log('\n❌ Checkout failed');
    }

  } catch (error) {
    console.error('❌ Error fixing account:', error);
  } finally {
    mongoose.connection.close();
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Try checkout again from frontend');
    console.log('2. Make sure to select the default address');
    console.log('3. Check browser console for any errors');
    console.log('4. Watch backend terminal for email logs');
    
    process.exit(0);
  }
}