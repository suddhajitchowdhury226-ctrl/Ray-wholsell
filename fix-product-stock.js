const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./Models/productModel');

const fixProductStock = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI;
    console.log('🔗 Connecting to MongoDB:', mongoUri ? '✓' : '✗');
    await mongoose.connect(mongoUri);
    console.log('📝 Connected to MongoDB');
    
    // Find all products with stock = 0 or undefined
    const result = await Product.updateMany(
      { $or: [{ stock: { $eq: 0 } }, { stock: { $exists: false } }] },
      { $set: { stock: 100 } }
    );
    
    console.log('✅ Updated products:', result.modifiedCount);
    console.log('📊 Matched products:', result.matchedCount);
    
    // Get product count
    const total = await Product.countDocuments({});
    console.log('📦 Total products in database:', total);
    
    // Show first 10 products with their stock
    const products = await Product.find({}, 'name stock').limit(10);
    console.log('\n🛍️ Sample products:');
    products.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.name} - Stock: ${p.stock}`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixProductStock();
