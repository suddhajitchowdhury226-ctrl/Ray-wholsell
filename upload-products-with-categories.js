const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

// Import models
const Product = require('./Models/productModel');
const Category = require('./Models/categoryModel');
const Brand = require('./Models/brandModel');

const ADMIN_ID = '6a81c579b4004187e8640f70';
let createdCategories = {};
let createdBrands = {};

async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ DB Connection Error:', error.message);
    process.exit(1);
  }
}

async function getOrCreateCategory(categoryName) {
  if (createdCategories[categoryName]) {
    return createdCategories[categoryName];
  }

  try {
    let category = await Category.findOne({ name: categoryName });
    
    if (!category) {
      category = new Category({
        name: categoryName,
        description: `${categoryName} - Wholesale Products`,
        createdBy: ADMIN_ID,
        department: categoryName
      });
      await category.save();
      console.log(`  📁 Created category: ${categoryName}`);
    }
    
    createdCategories[categoryName] = category._id;
    return category._id;
  } catch (error) {
    console.error(`❌ Error with category ${categoryName}:`, error.message);
    return null;
  }
}

async function getOrCreateBrand(brandName) {
  if (createdBrands[brandName]) {
    return createdBrands[brandName];
  }

  try {
    if (!brandName) return null;
    
    let brand = await Brand.findOne({ name: brandName });
    
    if (!brand) {
      brand = new Brand({
        name: brandName,
        createdBy: ADMIN_ID
      });
      await brand.save();
      console.log(`  🏷️  Created brand: ${brandName}`);
    }
    
    createdBrands[brandName] = brand._id;
    return brand._id;
  } catch (error) {
    console.error(`❌ Error with brand ${brandName}:`, error.message);
    return null;
  }
}

async function uploadProducts() {
  console.log('🚀 Starting product upload with categories...');
  console.log('==================================================');
  
  try {
    // Read products with categories
    const productsJsonPath = path.join(__dirname, 'products-with-categories.json');
    const products = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
    
    console.log(`📦 Uploading ${products.length} products...`);
    
    let successCount = 0;
    let failCount = 0;

    // Upload products in batches
    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        // Get or create category
        const categoryId = await getOrCreateCategory(productData.category);
        if (!categoryId) {
          failCount++;
          continue;
        }

        // Get or create brand
        const brandId = await getOrCreateBrand(productData.brand);
        if (!brandId) {
          failCount++;
          continue;
        }

        // Create product with stock set to quantity value (or default if not available)
        const product = new Product({
          name: productData.name,
          description: productData.description,
          ingredient: productData.ingredient,
          sellPrice: productData.sellPrice,
          buyPrice: productData.buyPrice,
          category: categoryId,
          brand: brandId,
          lookup_code: productData.lookup_code,
          item_number: productData.item_number,
          upc: productData.upc,
          department: productData.department,
          quantity: productData.quantity,
          size: productData.size,
          stock: productData.quantity || 100 // Set stock from quantity, default 100 if not specified
        });

        await product.save();
        successCount++;

        // Show progress
        if ((i + 1) % 50 === 0) {
          console.log(`  ✅ Uploaded ${i + 1}/${products.length} products...`);
        }
      } catch (error) {
        failCount++;
        if (error.message.includes('E11000')) {
          // Duplicate key - skip silently
        } else {
          console.error(`  ❌ Product ${i + 1} error:`, error.message.substring(0, 80));
        }
      }
    }

    console.log('\n📊 Upload Summary:');
    console.log(`  ✅ Successfully uploaded: ${successCount} products`);
    console.log(`  ❌ Failed: ${failCount} products`);
  } catch (error) {
    console.error('Upload error:', error.message);
  }
}

async function deleteOldProducts() {
  try {
    console.log('🗑️  Deleting old products...');
    const result = await Product.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} old products`);
  } catch (error) {
    console.error('Delete error:', error.message);
  }
}

async function main() {
  await connectDB();
  await deleteOldProducts();
  await uploadProducts();
  
  console.log('==================================================');
  console.log('✅ Upload process completed!');
  console.log('==================================================');
  
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
