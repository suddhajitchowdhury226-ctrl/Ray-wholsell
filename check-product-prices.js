const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./Models/productModel');

const checkPrices = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL;
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    
    console.log('📊 Checking product prices...\n');
    
    // Get first 10 products
    const products = await Product.find({}).limit(10).select('name buyPrice sellPrice stock');
    
    console.log('Sample Products:');
    console.log('================\n');
    
    products.forEach((p, i) => {
      console.log(`${i+1}. ${p.name}`);
      console.log(`   - buyPrice: ${p.buyPrice}`);
      console.log(`   - sellPrice: ${p.sellPrice}`);
      console.log(`   - stock: ${p.stock}`);
      console.log('');
    });
    
    // Check for products without prices
    const noPrices = await Product.countDocuments({
      $or: [
        { buyPrice: { $exists: false } },
        { sellPrice: { $exists: false } },
        { buyPrice: null },
        { sellPrice: null }
      ]
    });
    
    console.log(`\n⚠️ Products without prices: ${noPrices}`);
    
    // Get total count
    const total = await Product.countDocuments({});
    console.log(`📦 Total products: ${total}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkPrices();
