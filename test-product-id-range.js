const mongoose = require('mongoose');
const Product = require('./Models/productModel');
require('dotenv').config();

console.log('🧪 Testing Product ID Range Query (200-609)\n');

mongoose.connect(process.env.DATABASE_URL)
.then(async () => {
  try {
    // Test the query - get products 200-209
    const products = await Product.find({
      item_number: { $gte: '200', $lte: '209' }
    }).select('item_number name originalProductName').sort({ item_number: 1 }).lean();
    
    console.log('✅ Test Query Results (Product ID 200-209):\n');
    products.forEach((p, i) => {
      console.log(`${i+1}. ID: ${p.item_number} | ${p.originalProductName || p.name}`);
    });
    
    console.log(`\nFound: ${products.length} products\n`);
    
    // Count total in range 200-609
    const count = await Product.countDocuments({
      item_number: { $gte: '200', $lte: '609' }
    });
    
    console.log(`📊 Summary:`);
    console.log(`Total products in range 200-609: ${count}`);
    
    // Get first and last
    const first = await Product.findOne({
      item_number: { $gte: '200', $lte: '609' }
    }).sort({ item_number: 1 }).lean();
    
    const last = await Product.findOne({
      item_number: { $gte: '200', $lte: '609' }
    }).sort({ item_number: -1 }).lean();
    
    console.log(`First product (ID ${first.item_number}): ${first.originalProductName || first.name}`);
    console.log(`Last product (ID ${last.item_number}): ${last.originalProductName || last.name}`);
    
    console.log('\n✅ Query works correctly!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}).catch(e => { 
  console.error('Connection error:', e.message); 
  process.exit(1); 
});
