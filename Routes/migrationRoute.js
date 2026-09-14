/**
 * Migration Route
 * ONE-TIME USE: Run database migrations on demand
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Dynamically import/load product model
let Product;

// Load product model on first use
async function getProductModel() {
  if (!Product) {
    try {
      // Try to get from mongoose connection
      const mongoose = require('mongoose');
      const productSchema = new mongoose.Schema({
        rhlId: { type: Number, index: true },
        category: String,
        type: String,
        name: String,
        manufacturerName: String,
        description: String,
        ingredients: String,
        status: { type: String, default: 'active' },
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
      }, { timestamps: true, strict: false });

      Product = mongoose.model('Product', productSchema, 'products');
    } catch (error) {
      console.error('❌ Failed to load Product model:', error);
      throw error;
    }
  }
  return Product;
}

/**
 * POST /api/migration/run-all
 * Simplified migration: Seed import only
 */
router.post('/run-all', async (req, res) => {
  try {
    console.log('🔔 Migration endpoint called');
    
    // Get seed file
    const seedFile = path.join(__dirname, '../rhl-product-catalog-seed.json');
    if (!fs.existsSync(seedFile)) {
      return res.status(404).json({ 
        message: 'Seed file not found',
        seedPath: seedFile
      });
    }

    console.log('📖 Reading seed file...');
    const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const seedProducts = Array.isArray(seedData) ? seedData : seedData.products || [];

    console.log(`📦 Found ${seedProducts.length} products in seed file`);

    // Get Product model
    const ProductModel = await getProductModel();

    // Upsert products
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const results = { inserted: 0, updated: 0, failed: 0, products: [] };

    for (const seedProduct of seedProducts) {
      try {
        if (!seedProduct.rhlId || !seedProduct.name) {
          console.warn(`⚠️  Skipping invalid product:`, seedProduct);
          errors++;
          continue;
        }

        const result = await ProductModel.findOneAndUpdate(
          { rhlId: seedProduct.rhlId },
          {
            $set: {
              rhlId: seedProduct.rhlId,
              name: seedProduct.name,
              category: seedProduct.category,
              type: seedProduct.type,
              description: seedProduct.description,
              ingredients: seedProduct.ingredients,
              manufacturerName: seedProduct.manufacturerName,
              variants: seedProduct.variants,
              status: 'active'
            }
          },
          { upsert: true, new: true }
        );

        if (result._id.toString() === (seedProduct._id || seedProduct.rhlId).toString()) {
          updated++;
          results.updated++;
        } else {
          inserted++;
          results.inserted++;
        }

        results.products.push({
          rhlId: seedProduct.rhlId,
          name: seedProduct.name,
          variants: seedProduct.variants?.length || 0
        });
      } catch (error) {
        console.error(`❌ Error upserting product ${seedProduct.rhlId}:`, error.message);
        errors++;
        results.failed++;
      }
    }

    console.log(`\n✅ Migration Complete:`);
    console.log(`  • Inserted: ${inserted}`);
    console.log(`  • Updated: ${updated}`);
    console.log(`  • Failed: ${errors}`);

    res.json({
      message: 'Migration completed',
      stats: {
        totalProcessed: seedProducts.length,
        inserted,
        updated,
        failed: errors
      },
      sampleProducts: results.products.slice(0, 5),
      totalImported: inserted + updated
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      message: 'Migration failed',
      error: error.message
    });
  }
});

/**
 * GET /api/migration/status
 * Check migration endpoint health
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Migration endpoint is ready',
    endpoints: {
      runAll: 'POST /api/migration/run-all'
    }
  });
});

module.exports = router;
