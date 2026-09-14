/**
 * Update Script: Sync product names from new seed file
 * 
 * This script reads rhl_products_with_bin_location.json and updates
 * product names in MongoDB to match the new names.
 * 
 * Run: node update-product-names.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';
const SEED_FILE = path.join(__dirname, '../rhl_products_with_bin_location.json');

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

productSchema.index({ rhlId: 1 });
productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);

async function updateProductNames() {
  try {
    console.log('📝 Starting product name update...\n');

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
      namesUpdated: 0,
      namesUnchanged: 0,
      notFound: 0,
      errors: 0,
      changedNames: []
    };

    console.log('🚀 Updating product names...\n');

    for (const seedProduct of seedData) {
      try {
        const product = await Product.findOne({ rhlId: seedProduct.rhlId });
        if (!product) {
          console.warn(`⚠️  Product not found: RHL#${seedProduct.rhlId}`);
          stats.notFound++;
          continue;
        }

        stats.productsProcessed++;

        // Check if name changed
        if (product.name !== seedProduct.name) {
          const oldName = product.name;
          product.name = seedProduct.name;
          await product.save();

          stats.namesUpdated++;
          stats.changedNames.push({
            rhlId: seedProduct.rhlId,
            oldName,
            newName: seedProduct.name
          });

          console.log(`✓ RHL#${seedProduct.rhlId}:`);
          console.log(`  Old: "${oldName}"`);
          console.log(`  New: "${seedProduct.name}"\n`);
        } else {
          stats.namesUnchanged++;
        }

      } catch (error) {
        console.error(`❌ Error updating product ${seedProduct.rhlId}:`, error.message);
        stats.errors++;
      }
    }

    console.log('✅ Update complete!\n');
    console.log('📊 Statistics:');
    console.log(`  • Products processed: ${stats.productsProcessed}`);
    console.log(`  • Names updated: ${stats.namesUpdated}`);
    console.log(`  • Names unchanged: ${stats.namesUnchanged}`);
    console.log(`  • Products not found: ${stats.notFound}`);
    console.log(`  • Errors: ${stats.errors}`);

    if (stats.changedNames.length > 0) {
      console.log(`\n📝 Changed Names (${stats.changedNames.length}):`);
      stats.changedNames.forEach((item, idx) => {
        console.log(`\n${idx + 1}. RHL#${item.rhlId}`);
        console.log(`   ${item.oldName}`);
        console.log(`   ↓`);
        console.log(`   ${item.newName}`);
      });
    }

    console.log('\n✅ Product name update complete!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateProductNames();
