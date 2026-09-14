/**
 * Import Script: Upsert seed data from rhl-product-catalog-seed.json
 * 
 * This script reads the authoritative seed file and upserts all products.
 * It reports: inserted, updated, unchanged, and products with null prices.
 * 
 * Run: node import-seed-data.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';
const SEED_FILE = path.join(__dirname, '../rhl-product-catalog-seed.json');

// Product schema
const productSchema = new mongoose.Schema({
  rhlId: { type: Number, required: true, unique: true, index: true },
  category: { type: String, required: true, index: true },
  type: String,
  name: { type: String, required: true },
  manufacturerName: String,
  description: String,
  ingredients: String,
  bin_location: String,
  status: { type: String, default: 'active' },
  variants: [{
    size: { type: String, required: true },
    itemNumber: { type: String, required: true, unique: true },
    rhlUpc: String,
    manufacturerUpc: String,
    price: Number,
    status: { type: String, default: 'active' }
  }],
  // Legacy fields for backwards compatibility
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

productSchema.index({ rhlId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ 'variants.itemNumber': 1 });
productSchema.index({ 'variants.rhlUpc': 1 });
productSchema.index({ 'variants.manufacturerUpc': 1 });

const Product = mongoose.model('Product', productSchema);

async function importSeedData() {
  try {
    console.log('📚 Starting seed data import...\n');

    // Check if seed file exists
    if (!fs.existsSync(SEED_FILE)) {
      console.error(`❌ Seed file not found: ${SEED_FILE}`);
      process.exit(1);
    }

    // Read seed file
    const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    console.log(`✅ Loaded ${seedData.length} products from seed file\n`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Statistics
    const stats = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      nullPrices: [],
      duplicateItemNumbers: []
    };

    // Check for duplicate item numbers in seed
    const itemNumberMap = new Map();
    seedData.forEach(product => {
      product.variants.forEach(variant => {
        if (itemNumberMap.has(variant.itemNumber)) {
          stats.duplicateItemNumbers.push({
            itemNumber: variant.itemNumber,
            products: [itemNumberMap.get(variant.itemNumber), product.rhlId]
          });
        }
        itemNumberMap.set(variant.itemNumber, product.rhlId);
      });
    });

    if (stats.duplicateItemNumbers.length > 0) {
      console.warn(`⚠️  Found ${stats.duplicateItemNumbers.length} duplicate item numbers in seed data:`);
      stats.duplicateItemNumbers.forEach(dup => {
        console.warn(`  • ItemNumber ${dup.itemNumber} appears in products ${dup.products.join(', ')}`);
      });
      console.log('');
    }

    // Upsert each product
    console.log('🚀 Upserting products...\n');

    for (const productData of seedData) {
      try {
        // Check for null prices in variants
        productData.variants.forEach(variant => {
          if (variant.price === null) {
            stats.nullPrices.push({
              rhlId: productData.rhlId,
              name: productData.name,
              variant: variant.size,
              itemNumber: variant.itemNumber
            });
          }
        });

        // Upsert by rhlId
        const result = await Product.findOneAndUpdate(
          { rhlId: productData.rhlId },
          productData,
          { upsert: true, new: true }
        );

        if (result.isNew || !result._doc.updatedAt) {
          // Newly inserted
          stats.inserted++;
        } else {
          // Check if actually changed or just matched
          const existingData = await Product.findOne({ rhlId: productData.rhlId }).lean();
          const dataChanged = JSON.stringify(productData) !== JSON.stringify(existingData);
          
          if (dataChanged) {
            stats.updated++;
          } else {
            stats.unchanged++;
          }
        }

      } catch (error) {
        console.error(`❌ Error upserting product ${productData.rhlId} (${productData.name}):`, error.message);
        stats.errors++;
      }
    }

    console.log('✅ Upsert complete!\n');
    console.log('📊 Import Statistics:');
    console.log(`  • Products inserted: ${stats.inserted}`);
    console.log(`  • Products updated: ${stats.updated}`);
    console.log(`  • Products unchanged: ${stats.unchanged}`);
    console.log(`  • Total processed: ${stats.inserted + stats.updated + stats.unchanged}`);
    console.log(`  • Errors: ${stats.errors}`);
    console.log(`  • Total variants: ${seedData.reduce((sum, p) => sum + p.variants.length, 0)}`);

    if (stats.nullPrices.length > 0) {
      console.log(`\n⚠️  Products with NULL prices (${stats.nullPrices.length}):`);
      console.log('  These items are missing wholesale pricing in the source data.\n');
      stats.nullPrices.forEach(item => {
        console.log(`  • RHL#${item.rhlId} - ${item.name}`);
        console.log(`    └─ ${item.variant} (Item#: ${item.itemNumber})`);
      });
      console.log('\n  ℹ️  Action: Update source pricing sheet and re-run import.');
    }

    if (stats.duplicateItemNumbers.length > 0) {
      console.log(`\n⚠️  Duplicate item numbers found (${stats.duplicateItemNumbers.length})`);
      console.log('  These should be unique identifiers. Review source data.');
    }

    console.log('\n✅ Seed data import complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify the import statistics above');
    console.log('  2. Check null prices and resolve missing data');
    console.log('  3. Create/update API endpoints');
    console.log('  4. Test frontend integration');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importSeedData();
