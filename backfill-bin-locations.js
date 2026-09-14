/**
 * Backfill Script: Add bin location to variants from seed file
 * 
 * This script reads rhl_products_with_bin_location.json and updates each product's variants
 * with the binLocation field matched by manufacturerUpc.
 * 
 * Run: node backfill-bin-locations.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';
const SEED_FILE = path.join(__dirname, '../rhl_products_with_bin_location.json');

// Product schema (same as main model)
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
    size: String,
    itemNumber: String,
    rhlUpc: String,
    manufacturerUpc: String,
    price: Number,
    binLocation: String,
    status: { type: String, default: 'active' }
  }],
  images: [{
    url: String,
    key: String,
    altText: String,
    isPrimary: Boolean,
    order: Number,
    uploadedAt: Date
  }],
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
  legacyImages: [String],
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

// Add indexes
productSchema.index({ rhlId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ 'variants.itemNumber': 1 });
productSchema.index({ 'variants.rhlUpc': 1 });
productSchema.index({ 'variants.manufacturerUpc': 1 });

const Product = mongoose.model('Product', productSchema);

async function backfillBinLocations() {
  try {
    console.log('📦 Starting bin location backfill...\n');

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
      productsProcessed: 0,
      variantsUpdated: 0,
      variantsWithBinLocation: 0,
      variantsSkipped: 0,
      variantsNotFound: 0,
      errors: 0
    };

    console.log('🚀 Processing bin locations...\n');

    for (const seedProduct of seedData) {
      try {
        const product = await Product.findOne({ rhlId: seedProduct.rhlId });
        if (!product) {
          console.warn(`⚠️  Product not found: RHL#${seedProduct.rhlId}`);
          continue;
        }

        stats.productsProcessed++;
        let productUpdated = false;

        // Process each variant in seed
        for (const seedVariant of seedProduct.variants) {
          // Skip if no bin location in seed
          if (!seedVariant.binLocation) {
            stats.variantsSkipped++;
            continue;
          }

          stats.variantsWithBinLocation++;

          // Find matching variant by manufacturerUpc
          const variant = product.variants.find(
            v => v.manufacturerUpc === seedVariant.manufacturerUpc
          );

          if (!variant) {
            console.warn(`⚠️  Variant not found for RHL#${seedProduct.rhlId}: UPC ${seedVariant.manufacturerUpc}`);
            stats.variantsNotFound++;
            continue;
          }

          // Update bin location
          const oldBinLocation = variant.binLocation;
          variant.binLocation = seedVariant.binLocation;
          productUpdated = true;
          stats.variantsUpdated++;

          if (oldBinLocation !== seedVariant.binLocation) {
            console.log(`  ✓ RHL#${seedProduct.rhlId} (${seedVariant.size}): ${oldBinLocation || 'null'} → ${seedVariant.binLocation}`);
          }
        }

        // Save if any variant was updated
        if (productUpdated) {
          await product.save();
        }

      } catch (error) {
        console.error(`❌ Error processing product ${seedProduct.rhlId}:`, error.message);
        stats.errors++;
      }
    }

    console.log('\n✅ Backfill complete!\n');
    console.log('📊 Statistics:');
    console.log(`  • Products processed: ${stats.productsProcessed}`);
    console.log(`  • Variants updated: ${stats.variantsUpdated}`);
    console.log(`  • Variants with bin location in seed: ${stats.variantsWithBinLocation}`);
    console.log(`  • Variants skipped (no bin location): ${stats.variantsSkipped}`);
    console.log(`  • Variants not found in DB: ${stats.variantsNotFound}`);
    console.log(`  • Errors: ${stats.errors}`);

    if (stats.variantsNotFound > 0) {
      console.log(`\n⚠️  ${stats.variantsNotFound} variants from seed could not be matched in database`);
      console.log('  These may be new products or have different UPC codes');
    }

    console.log('\n✅ Bin location backfill complete!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

backfillBinLocations();
