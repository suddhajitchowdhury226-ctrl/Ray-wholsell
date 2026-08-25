const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
require('dotenv').config();

// Import models
const Product = require('./Models/productModel');
const Category = require('./Models/categoryModel');
const User = require('./Models/user');

// Helper function to connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);
  }
}

// Get admin user
async function getAdminUser() {
  try {
    let admin = await User.findOne({ role: 'admin' }).limit(1);
    
    if (!admin) {
      admin = await User.findOne({}).limit(1);
    }

    if (!admin) {
      throw new Error('No admin user found in database');
    }

    return admin._id;
  } catch (error) {
    console.error('✗ Error getting admin user:', error.message);
    throw error;
  }
}

// Parse CSV file
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Parse Excel file
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error('Error parsing Excel file:', error.message);
    return [];
  }
}

// Transform CSV product data
function transformCSVProduct(row) {
  const price = parseFloat(row['Price'] || row['Wholesale Pricing'] || 0);
  const cost = parseFloat(row['Cost'] || 0);
  let stock = parseInt(row['Qty On Hand'] || row['Available Quantity'] || 0);
  
  // Ensure stock is never negative
  if (stock < 0) {
    stock = 0;
  }
  
  return {
    name: row['Description'] || row['Product Title'] || 'Unknown Product',
    description: row['Product Title -                                                    Extended Description (ED)'] || row['Description'] || '',
    categoryName: row['Categories'] || row['DEPARTMENTS'] || 'Other',
    brand: row['BRAND1'] || row['BRAND2'] || 'Ray\'s Healthy Living',
    sellPrice: price || 0,
    buyPrice: cost || 0,
    stock: stock,
    sku: row['Item Lookup Code'] || row['Item #'] || '',
    supplierName: row['Supplier Name'] || 'Ray\'s Healthy Living',
    ingredient: row['Ingredents'] || '',
    reorder: parseInt(row['Reorder Point'] || 10),
    images: [],
    bin_location: row['Bin Location'] || ''
  };
}

// Transform Excel product data
function transformExcelProduct(row) {
  const price = parseFloat(row['Price'] || row['Wholesale Pricing'] || 0);
  const cost = parseFloat(row['Cost'] || 0);
  
  return {
    name: row['Description'] || row['Product Title'] || 'Unknown Product',
    description: row['Extended Description'] || row['Description'] || '',
    categoryName: row['Categories'] || row['Department'] || 'Other',
    brand: row['Brand'] || 'Ray\'s Healthy Living',
    sellPrice: price || 0,
    buyPrice: cost || 0,
    stock: parseInt(row['Quantity'] || row['Available Quantity'] || 0),
    sku: row['SKU'] || row['Item #'] || '',
    supplierName: row['Supplier'] || 'Ray\'s Healthy Living',
    ingredient: row['Ingredients'] || '',
    reorder: parseInt(row['Reorder Point'] || 10),
    images: [],
    bin_location: row['Bin Location'] || ''
  };
}

// Clear existing demo products
async function clearDemoProducts() {
  try {
    const result = await Product.deleteMany({});
    console.log(`✓ Cleared ${result.deletedCount} previous products`);
  } catch (error) {
    console.error('✗ Error clearing demo products:', error.message);
    throw error;
  }
}

// Get or create category
async function getOrCreateCategory(categoryName, createdBy) {
  try {
    let category = await Category.findOne({ name: { $regex: categoryName, $options: 'i' } });
    
    if (!category) {
      category = new Category({
        name: categoryName || 'Other',
        createdBy: createdBy,
        image: '',
        department: categoryName || 'Other'
      });
      await category.save();
    }
    
    return category._id;
  } catch (error) {
    console.error(`✗ Error with category ${categoryName}:`, error.message);
    return null;
  }
}

// Import products
async function importProducts(products, adminId) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const productData of products) {
    try {
      // Get or create category
      const categoryId = await getOrCreateCategory(productData.categoryName, adminId);
      
      if (!categoryId) {
        throw new Error('Failed to get/create category');
      }

      // Create product
      const product = new Product({
        name: productData.name,
        description: productData.description,
        category: categoryId,
        sellPrice: productData.sellPrice,
        buyPrice: productData.buyPrice || 0,
        stock: productData.stock || 0,
        sku: productData.sku || `SKU-${Date.now()}`,
        supplierName: productData.supplierName,
        ingredient: productData.ingredient,
        reorder: productData.reorder || 10,
        images: productData.images || [],
        bin_location: productData.bin_location || '',
        createdBy: adminId
      });

      await product.save();
      successCount++;

      if (successCount % 10 === 0) {
        console.log(`  ⏳ Imported ${successCount} products...`);
      }
    } catch (error) {
      errorCount++;
      errors.push({
        product: productData.name,
        error: error.message
      });
    }
  }

  return { successCount, errorCount, errors };
}

// Main execution
async function main() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Ray Wholesale - Product Data Import   ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Connect to database
    await connectDB();

    // Get admin user
    console.log('\n👤 Fetching admin user...');
    const adminId = await getAdminUser();
    console.log('✓ Admin user found');

    // Clear demo products
    console.log('\n📋 Clearing demo products...');
    await clearDemoProducts();

    // Parse data files
    console.log('\n📂 Parsing data files...');
    
    const csvPath = path.join(__dirname, '..', 'Ray-Wholsell', 'RHL 1 Items  July 21 26(Sheet1).csv');
    const excelPath = path.join(__dirname, '..', 'Ray-Wholsell', 'Untitled spreadsheet.xlsx');

    let allProducts = [];

    // Parse CSV
    if (fs.existsSync(csvPath)) {
      console.log('  📖 Reading CSV file...');
      const csvData = await parseCSVFile(csvPath);
      const csvProducts = csvData
        .map(transformCSVProduct)
        .filter(p => p.name && p.name !== 'Unknown Product');
      allProducts = allProducts.concat(csvProducts);
      console.log(`  ✓ Found ${csvProducts.length} products in CSV`);
    } else {
      console.log(`  ⚠ CSV file not found: ${csvPath}`);
    }

    // Parse Excel
    if (fs.existsSync(excelPath)) {
      console.log('  📊 Reading Excel file...');
      const excelData = parseExcelFile(excelPath);
      const excelProducts = excelData
        .map(transformExcelProduct)
        .filter(p => p.name && p.name !== 'Unknown Product');
      allProducts = allProducts.concat(excelProducts);
      console.log(`  ✓ Found ${excelProducts.length} products in Excel`);
    } else {
      console.log(`  ⚠ Excel file not found: ${excelPath}`);
    }

    // Remove duplicates based on name and sku
    const uniqueProducts = [];
    const seen = new Set();

    for (const product of allProducts) {
      const key = `${product.name}_${product.sku}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProducts.push(product);
      }
    }

    console.log(`\n✓ Total unique products to import: ${uniqueProducts.length}`);

    // Import products
    console.log('\n🚀 Importing products to database...');
    const result = await importProducts(uniqueProducts, adminId);

    // Print results
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           IMPORT COMPLETE              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`✓ Successfully imported: ${result.successCount} products`);
    console.log(`✗ Failed to import: ${result.errorCount} products`);

    if (result.errors.length > 0) {
      console.log('\n⚠ Errors encountered:');
      result.errors.slice(0, 5).forEach(err => {
        console.log(`  • ${err.product}: ${err.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
    }

    console.log('\n✓ Import process completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { importProducts, parseCSVFile, parseExcelFile };
