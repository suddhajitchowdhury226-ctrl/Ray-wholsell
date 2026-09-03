const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

// Import models
const Product = require('./Models/productModel');
const Category = require('./Models/categoryModel');
const Brand = require('./Models/brandModel');

// Product JSON file path
const productsJsonPath = path.join(__dirname, 'products-extracted.json');

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function deleteOldProducts() {
  try {
    console.log('🗑️  Deleting old products...');
    const result = await Product.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} old products\n`);
  } catch (error) {
    console.error('❌ Error deleting old products:', error.message);
  }
}

async function getOrCreateCategory(categoryName) {
  try {
    // Default to a general category if none provided
    const name = categoryName || 'Health Supplements';
    
    let category = await Category.findOne({ name });
    
    if (!category) {
      category = new Category({
        name,
        description: `${name} - Wholesale Products`,
        createdBy: '6a81c579b4004187e8640f70' // Admin user ID
      });
      await category.save();
      console.log(`  📁 Created category: ${name}`);
    }
    
    return category._id;
  } catch (error) {
    console.error(`Error with category ${categoryName}:`, error.message);
    return null;
  }
}

async function getOrCreateBrand(brandName) {
  try {
    if (!brandName) return null;
    
    let brand = await Brand.findOne({ name: brandName });
    
    if (!brand) {
      brand = new Brand({
        name: brandName,
        createdBy: '6a81c579b4004187e8640f70' // Admin user ID
      });
      await brand.save();
      console.log(`  🏷️  Created brand: ${brandName}`);
    }
    
    return brand._id;
  } catch (error) {
    console.error(`Error with brand ${brandName}:`, error.message);
    return null;
  }
}

async function uploadProducts() {
  try {
    // Read the extracted products JSON
    const productsData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
    
    console.log(`📦 Uploading ${productsData.length} products...\n`);
    
    // Get or create default category
    const defaultCategoryId = await getOrCreateCategory('Health Supplements');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < productsData.length; i++) {
      try {
        const productData = productsData[i];
        
        // Get or create brand
        let brandId = null;
        if (productData.productType) {
          brandId = await getOrCreateBrand(productData.productType);
        }
        
        // Create product document
        const product = new Product({
          name: productData.title || productData.name,
          sku: productData.upc || productData.rhlProductId,
          item_number: productData.itemNum || productData.rhlProductId,
          lookup_code: productData.upc,
          sellPrice: parseFloat(productData.wholesalePrice) || 0,
          buyPrice: parseFloat(productData.rhlCost) || 0,
          stock: 100, // Default stock
          category: defaultCategoryId,
          brand: brandId,
          description: productData.description,
          ingredient: productData.ingredients,
          additional: productData.ingredients,
          disclaimer: '',
          images: [],
        });
        
        await product.save();
        successCount++;
        
        // Show progress every 50 products
        if ((i + 1) % 50 === 0) {
          console.log(`  ✓ Uploaded ${i + 1}/${productsData.length} products...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          index: i,
          product: productsData[i].name,
          error: error.message
        });
      }
    }
    
    console.log(`\n📊 Upload Summary:`);
    console.log(`  ✅ Successfully uploaded: ${successCount} products`);
    console.log(`  ❌ Failed: ${errorCount} products`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n🚨 Errors:`);
      errors.forEach(err => {
        console.log(`  - ${err.product}: ${err.error}`);
      });
    }
    
    return { successCount, errorCount };
  } catch (error) {
    console.error('❌ Error uploading products:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Starting product upload process...\n');
    console.log('=' .repeat(50));
    
    await connectDatabase();
    await deleteOldProducts();
    const result = await uploadProducts();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Upload process completed!');
    console.log('=' .repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
