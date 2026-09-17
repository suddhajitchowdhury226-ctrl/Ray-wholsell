const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./Models/productModel');
const Category = require('./Models/categoryModel');
const Brand = require('./Models/brandModel');

async function addDemoProduct() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Check if demo product already exists
    const existing = await Product.findOne({ item_number: 'DEMO-001' });
    if (existing) {
      console.log('⚠️  Demo product already exists!');
      console.log(`Product ID: ${existing._id}`);
      console.log(`Name: ${existing.name}`);
      console.log(`Price: $${existing.sellPrice}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Use existing category and brand from database
    const category = await Category.findOne({});
    const brand = await Brand.findOne({});
    
    if (!category || !brand) {
      console.log('❌ No category or brand found. Please create them first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`📁 Using Category: ${category.name}`);
    console.log(`🏷️  Using Brand: ${brand.name}\n`);

    // Create demo product
    const demoProduct = new Product({
      item_number: 'DEMO-001',
      lookup_code: 'DEMO-UPC-001',
      name: 'Demo Product - Test Item',
      originalProductName: 'Demo Product for Testing',
      rhlId: 999, // Using 999 as demo ID
      buyPrice: 0.75,
      sellPrice: 1.00,
      stock: 1000,
      category: category._id,
      brand: brand._id,
      images: [
        {
          key: 'demo-product-image.jpg',
          url: 'https://via.placeholder.com/500x500/4CAF50/ffffff?text=DEMO+PRODUCT',
          alt: 'Demo Product Image'
        }
      ],
      description: 'This is a demo product for testing purposes. You can use this to test the cart, checkout, and order flow. This product has a price of $1 for easy testing.',
      ingredient: 'Demo ingredients for testing purposes only. Not a real product.',
      variants: []
    });

    await demoProduct.save();

    console.log('✅ Demo product created successfully!\n');
    console.log('📦 Product Details:');
    console.log(`   ID: ${demoProduct._id}`);
    console.log(`   Item Number: ${demoProduct.item_number}`);
    console.log(`   Name: ${demoProduct.name}`);
    console.log(`   Buy Price: $${demoProduct.buyPrice}`);
    console.log(`   Sell Price: $${demoProduct.sellPrice}`);
    console.log(`   Stock: ${demoProduct.stock}`);
    console.log(`   Category: ${category.name}`);
    console.log(`   Brand: ${brand.name}`);
    
    console.log('\n✅ You can now see this product in your products list!');
    console.log('💡 Use this product to test cart, checkout, and orders.');
    console.log(`\n🔗 Product will appear at: /product/${demoProduct._id}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addDemoProduct();
