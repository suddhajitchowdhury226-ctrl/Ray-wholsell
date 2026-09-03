const mongoose = require('mongoose');
const Product = require('./Models/productModel');
require('dotenv').config();

console.log('🔍 Checking Product ID Format...\n');

mongoose.connect(process.env.DATABASE_URL)
.then(async () => {
  // Get first 10 products
  const products = await Product.find({})
    .select('_id name rhlProductId item_number originalProductName')
    .limit(10)
    .lean();
  
  console.log('📦 Sample Products:\n');
  products.forEach((p, i) => {
    console.log(`${i+1}. MongoDB _id: ${p._id}`);
    console.log(`   rhlProductId: ${p.rhlProductId}`);
    console.log(`   item_number: ${p.item_number}`);
    console.log(`   Name: ${p.originalProductName || p.name}`);
    console.log('');
  });
  
  // Check which field has numeric IDs
  console.log('📊 Field Analysis:\n');
  
  const withRhl = await Product.countDocuments({ rhlProductId: { $exists: true, $ne: null } });
  console.log(`Products with rhlProductId: ${withRhl}`);
  
  const withItem = await Product.countDocuments({ item_number: { $exists: true, $ne: null } });
  console.log(`Products with item_number: ${withItem}`);
  
  // Get one example of each
  const exRhl = await Product.findOne({ rhlProductId: { $exists: true, $ne: null } }).lean();
  if (exRhl) console.log(`\nExample rhlProductId: ${exRhl.rhlProductId}`);
  
  const exItem = await Product.findOne({ item_number: { $exists: true, $ne: null } }).lean();
  if (exItem) console.log(`Example item_number: ${exItem.item_number}`);
  
  mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
