const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Order = require('./Models/orderModel');
const User = require('./Models/user');
const Product = require('./Models/productModel');

async function createTestOrder() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Find a test user or create one
    let testUser = await User.findOne({ email: 'testuser@example.com' });
    if (!testUser) {
      testUser = new User({
        name: 'John Doe',
        email: 'testuser@example.com',
        phone: '1234567890',
        password: 'hashedpassword',
        role: 'user',
        websiteRole: 'wholesaler',
        addresses: [{
          title: 'Home',
          name: 'John Doe',
          contactNumber: '1234567890',
          email: 'testuser@example.com',
          addressLine1: '123 Main Street',
          addressLine2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipcode: '10001'
        }]
      });
      await testUser.save();
      console.log('✅ Created test user');
    }

    // Find some products or create test ones
    let testProducts = await Product.find().limit(2);
    if (testProducts.length === 0) {
      // Create test products
      const product1 = new Product({
        name: 'Test Product 1',
        description: 'Test description',
        category: 'Test Category',
        brand: 'Test Brand',
        sellPrice: 25.99,
        buyPrice: 19.99,
        stock: 100,
        images: ['test-image1.jpg']
      });
      
      const product2 = new Product({
        name: 'Test Product 2', 
        description: 'Test description 2',
        category: 'Test Category',
        brand: 'Test Brand',
        sellPrice: 35.99,
        buyPrice: 28.99,
        stock: 50,
        images: ['test-image2.jpg']
      });

      await product1.save();
      await product2.save();
      testProducts = [product1, product2];
      console.log('✅ Created test products');
    }

    // Create test order with pending_review status
    const testOrder = new Order({
      user: testUser._id,
      orderNumber: `TEST-${Date.now()}`,
      items: [
        {
          product: testProducts[0]._id,
          name: testProducts[0].name,
          quantity: 2,
          price: testProducts[0].buyPrice,
          websiteRole: 'wholesaler'
        },
        {
          product: testProducts[1]._id,
          name: testProducts[1].name,
          quantity: 1,
          price: testProducts[1].buyPrice,
          websiteRole: 'wholesaler'
        }
      ],
      deliveryAddress: testUser.addresses[0],
      subtotal: (testProducts[0].buyPrice * 2) + testProducts[1].buyPrice,
      shippingCost: 0,
      discount: 0,
      total: (testProducts[0].buyPrice * 2) + testProducts[1].buyPrice,
      status: 'pending_review',
      userEmail: testUser.email,
      websiteRole: 'wholesaler',
      notes: 'Test order created for admin panel testing'
    });

    await testOrder.save();
    console.log('✅ Test order created successfully!');
    console.log(`Order Number: ${testOrder.orderNumber}`);
    console.log(`Order ID: ${testOrder._id}`);
    console.log(`Status: ${testOrder.status}`);
    console.log(`Total: $${testOrder.total.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error creating test order:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestOrder();