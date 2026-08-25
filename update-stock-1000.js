const mongoose = require('mongoose');
const Product = require('./Models/productModel');
require('dotenv').config();

async function updateStock() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
    
    // Update all products to have stock of 1000
    const result = await Product.updateMany({}, { $set: { stock: 1000 } });
    
    console.log('✅ Updated ' + result.modifiedCount + ' products');
    console.log('✅ All products now have 1000 stock');
    console.log('✅ Users can now add 12+ items to cart');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateStock();
