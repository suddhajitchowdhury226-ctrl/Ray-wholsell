require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./Models/productModel');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const verifyProducts = async () => {
  await connectDB();

  console.log('=== PRODUCT VERIFICATION ===\n');

  try {
    // Get total product count
    const totalProducts = await Product.countDocuments();
    console.log(`📊 Total products in database: ${totalProducts}`);

    if (totalProducts === 0) {
      console.log('❌ NO PRODUCTS FOUND IN DATABASE!');
      console.log('   You need to add products before users can add to cart.');
      await mongoose.connection.close();
      return;
    }

    // Show first 10 products
    console.log('\n📋 First 10 products:\n');
    const products = await Product.find()
      .select('_id name stock buyPrice sellPrice')
      .limit(10)
      .lean();

    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Stock: ${product.stock}`);
      console.log(`   Buy Price: $${product.buyPrice}`);
      console.log('');
    });

    // Count products by stock status
    const inStock = await Product.countDocuments({ stock: { $gt: 0 } });
    const outOfStock = await Product.countDocuments({ stock: 0 });

    console.log(`📦 In Stock: ${inStock}`);
    console.log(`❌ Out of Stock: ${outOfStock}`);

    // Search for the specific product
    console.log('\n🔍 Searching for "PROBIOTICS 50 BILLION CFU"...');
    const probiotics = await Product.findOne({ 
      name: { $regex: 'PROBIOTICS 50 BILLION', $options: 'i' } 
    }).lean();

    if (probiotics) {
      console.log('✅ Found!');
      console.log(`   ID: ${probiotics._id}`);
      console.log(`   Stock: ${probiotics.stock}`);
      console.log(`   Buy Price: $${probiotics.buyPrice}`);
    } else {
      console.log('❌ NOT FOUND - This is why add-to-cart is failing!');
      console.log('\n💡 Solution: Add this product to the database or use a different product.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Verification complete');
  }
};

verifyProducts();
