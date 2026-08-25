const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./Models/productModel');
const Category = require('./Models/categoryModel');

async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);
  }
}

async function verifyImport() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     Verifying Product Data Import      ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Get product count
    const productCount = await Product.countDocuments();
    console.log(`📊 Total Products in Database: ${productCount}`);

    // Get category count
    const categoryCount = await Category.countDocuments();
    console.log(`📁 Total Categories: ${categoryCount}`);

    // Show sample products
    console.log('\n📦 Sample Products:');
    const sampleProducts = await Product.find().limit(5).populate('category', 'name');
    
    sampleProducts.forEach((product, index) => {
      console.log(`\n  ${index + 1}. ${product.name}`);
      console.log(`     SKU: ${product.sku || 'N/A'}`);
      console.log(`     Category: ${product.category?.name || 'N/A'}`);
      console.log(`     Buy Price: $${product.buyPrice || 0}`);
      console.log(`     Sell Price: $${product.sellPrice || 0}`);
      console.log(`     Stock: ${product.stock}`);
    });

    // Show categories
    console.log('\n\n📂 Sample Categories:');
    const sampleCategories = await Category.find().limit(10);
    
    sampleCategories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name}`);
    });

    // Get price statistics
    console.log('\n\n💰 Price Statistics:');
    const priceStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          avgSellPrice: { $avg: '$sellPrice' },
          maxSellPrice: { $max: '$sellPrice' },
          minSellPrice: { $min: '$sellPrice' },
          avgBuyPrice: { $avg: '$buyPrice' },
          maxBuyPrice: { $max: '$buyPrice' },
          minBuyPrice: { $min: '$buyPrice' }
        }
      }
    ]);

    if (priceStats.length > 0) {
      const stats = priceStats[0];
      console.log(`  Average Sell Price: $${stats.avgSellPrice?.toFixed(2) || 0}`);
      console.log(`  Max Sell Price: $${stats.maxSellPrice?.toFixed(2) || 0}`);
      console.log(`  Min Sell Price: $${stats.minSellPrice?.toFixed(2) || 0}`);
      console.log(`  Average Buy Price: $${stats.avgBuyPrice?.toFixed(2) || 0}`);
      console.log(`  Max Buy Price: $${stats.maxBuyPrice?.toFixed(2) || 0}`);
      console.log(`  Min Buy Price: $${stats.minBuyPrice?.toFixed(2) || 0}`);
    }

    // Get stock statistics
    console.log('\n\n📊 Stock Statistics:');
    const stockStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          avgStock: { $avg: '$stock' },
          maxStock: { $max: '$stock' },
          minStock: { $min: '$stock' },
          zeroStockCount: {
            $sum: {
              $cond: [{ $eq: ['$stock', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (stockStats.length > 0) {
      const stats = stockStats[0];
      console.log(`  Total Stock: ${stats.totalStock}`);
      console.log(`  Average Stock per Product: ${stats.avgStock?.toFixed(2) || 0}`);
      console.log(`  Max Stock: ${stats.maxStock}`);
      console.log(`  Min Stock: ${stats.minStock}`);
      console.log(`  Products with Zero Stock: ${stats.zeroStockCount}`);
    }

    // Get top 5 most stocked products
    console.log('\n\n🏆 Top 5 Most Stocked Products:');
    const topStocked = await Product.find().sort({ stock: -1 }).limit(5);
    
    topStocked.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - Stock: ${product.stock}`);
    });

    console.log('\n\n✅ Import Verification Complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Verification error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await verifyImport();
}

if (require.main === module) {
  main();
}
