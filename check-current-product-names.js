const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Product = require('./Models/productModel');

async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ DB Connection Error:', error.message);
    process.exit(1);
  }
}

async function checkProducts() {
  console.log('🔍 Checking current product names in database...\n');

  try {
    const count = await Product.countDocuments();
    console.log(`📊 Total products in database: ${count}\n`);

    // Get first 10 products
    const products = await Product.find().limit(10).select('name rhlProductName originalProductName rhlProductId item_number');

    console.log('📋 First 10 products:\n');
    products.forEach((prod, index) => {
      console.log(`${index + 1}. ID: ${prod._id}`);
      console.log(`   name: "${prod.name}"`);
      console.log(`   rhlProductName: "${prod.rhlProductName}"`);
      console.log(`   originalProductName: "${prod.originalProductName}"`);
      console.log(`   rhlProductId: "${prod.rhlProductId}"`);
      console.log(`   item_number: "${prod.item_number}"\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  await connectDB();
  await checkProducts();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
