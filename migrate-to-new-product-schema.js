/**
 * Migration Script: Update existing products collection to new schema
 * 
 * This script safely migrates existing products to the new schema while preserving all data.
 * It adds new fields (rhlId, category, type, ingredients, variants) without dropping data.
 * 
 * Run: node migrate-to-new-product-schema.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';

// Product schema for reference
const productSchema = new mongoose.Schema({
  rhlId: Number,
  category: String,
  type: String,
  name: String,
  manufacturerName: String,
  description: String,
  ingredients: String,
  status: String,
  variants: [{
    size: String,
    itemNumber: String,
    rhlUpc: String,
    manufacturerUpc: String,
    price: Number,
    status: String
  }],
  // Legacy fields
  rhlProductId: String,
  item_number: String,
  sku: String,
  buyPrice: Number,
  sellPrice: Number,
  wholesaleSellPrice: Number,
  stock: Number,
  categoryRef: mongoose.Schema.Types.ObjectId,
  subcategory: mongoose.Schema.Types.ObjectId,
  brand: mongoose.Schema.Types.ObjectId,
  images: [String],
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function migrate() {
  try {
    console.log('🔄 Starting migration to new product schema...\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all existing products
    const allProducts = await Product.find({}).lean();
    console.log(`📦 Found ${allProducts.length} existing products\n`);

    if (allProducts.length === 0) {
      console.log('ℹ️  No products to migrate. Database is clean.');
      await mongoose.disconnect();
      return;
    }

    // Analyze what needs to be migrated
    const stats = {
      alreadyHasRhlId: 0,
      needsRhlIdAssignment: 0,
      hasVariants: 0,
      noVariants: 0,
      hasCategory: 0,
      noCategory: 0,
      migrationNeeded: 0
    };

    allProducts.forEach(product => {
      if (product.rhlId) stats.alreadyHasRhlId++;
      else stats.needsRhlIdAssignment++;

      if (product.variants && product.variants.length > 0) {
        stats.hasVariants++;
      } else {
        stats.noVariants++;
      }

      if (product.category) stats.hasCategory++;
      else stats.noCategory++;

      // Check if migration needed (missing new required fields)
      if (!product.rhlId || !product.category || !product.name) {
        stats.migrationNeeded++;
      }
    });

    console.log('📊 Migration Analysis:');
    console.log(`  • Already has rhlId: ${stats.alreadyHasRhlId}`);
    console.log(`  • Needs rhlId assignment: ${stats.needsRhlIdAssignment}`);
    console.log(`  • Has variants: ${stats.hasVariants}`);
    console.log(`  • No variants: ${stats.noVariants}`);
    console.log(`  • Has category: ${stats.hasCategory}`);
    console.log(`  • No category: ${stats.noCategory}`);
    console.log(`  • Requires migration: ${stats.migrationNeeded}\n`);

    // Perform migration
    console.log('🚀 Performing safe schema update...\n');

    let updateCount = 0;
    let errorCount = 0;
    const productsWithIssues = [];

    for (const product of allProducts) {
      try {
        const updateData = {};
        let needsUpdate = false;

        // Ensure required fields have values
        if (!product.name) {
          console.warn(`⚠️  Product ${product._id} missing name`);
          productsWithIssues.push({ id: product._id, issue: 'missing name' });
          continue;
        }

        // Set defaults for new fields
        if (!product.rhlId) {
          // Use item_number as fallback, or create from timestamps
          updateData.rhlId = product.item_number || Date.now() % 100000;
          needsUpdate = true;
        }

        if (!product.category && !product.categoryRef) {
          updateData.category = 'UNCATEGORIZED';
          needsUpdate = true;
        } else if (!product.category && product.categoryRef) {
          // Keep as is - will be populated separately
        }

        if (!product.type && product.productDescription) {
          updateData.type = product.productDescription;
          needsUpdate = true;
        }

        if (!product.description && product.additional) {
          updateData.description = product.additional;
          needsUpdate = true;
        }

        if (!product.ingredients && product.ingredient) {
          updateData.ingredients = product.ingredient;
          needsUpdate = true;
        }

        // Ensure status exists
        if (!product.status) {
          updateData.status = 'active';
          needsUpdate = true;
        }

        // Create variants from legacy fields if they don't exist
        if ((!product.variants || product.variants.length === 0) && (product.sku || product.item_number)) {
          updateData.variants = [{
            size: product.productDescription || 'Standard',
            itemNumber: product.item_number || product.sku || `legacy-${product._id}`,
            rhlUpc: product.rhlProductId || null,
            manufacturerUpc: null,
            price: product.wholesaleSellPrice || product.sellPrice || product.buyPrice || null,
            status: product.status || 'active'
          }];
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Product.findByIdAndUpdate(product._id, updateData, { new: true });
          updateCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating product ${product._id}:`, error.message);
        errorCount++;
        productsWithIssues.push({ id: product._id, error: error.message });
      }
    }

    console.log('\n✅ Migration Complete!\n');
    console.log(`📈 Results:`);
    console.log(`  • Products updated: ${updateCount}`);
    console.log(`  • Products unchanged: ${allProducts.length - updateCount}`);
    console.log(`  • Errors encountered: ${errorCount}`);

    if (productsWithIssues.length > 0) {
      console.log(`\n⚠️  Products with issues (${productsWithIssues.length}):`);
      productsWithIssues.forEach(item => {
        console.log(`  • ${item.id}: ${item.issue || item.error}`);
      });
    }

    console.log('\n📝 Next steps:');
    console.log('  1. Review any products with issues above');
    console.log('  2. Run the import script to upsert seed data: node import-seed-data.js');
    console.log('  3. Verify new endpoints are working');

    await mongoose.disconnect();
    console.log('\n✅ Migration script complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
