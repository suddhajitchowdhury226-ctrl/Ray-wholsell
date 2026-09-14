/**
 * Migration Route
 * ONE-TIME USE: Run database migrations on demand
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const productModel = require('../Models/productModel');

/**
 * POST /api/migration/run-all
 * Simplified migration: Seed import only
 */
router.post('/run-all', async (req, res) => {
  try {
    console.log('🔔 Migration endpoint called');
    
    // Get seed file - try multiple paths
    let seedFilePath;
    const possiblePaths = [
      path.join(__dirname, '../rhl-product-catalog-seed.json'),
      path.join(__dirname, '../../rhl-product-catalog-seed.json'),
      path.join(process.cwd(), 'rhl-product-catalog-seed.json')
    ];

    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        seedFilePath = tryPath;
        break;
      }
    }

    if (!seedFilePath) {
      return res.status(404).json({ 
        message: 'Seed file not found',
        attempted: possiblePaths,
        cwd: process.cwd()
      });
    }

    console.log(`📖 Reading seed file from: ${seedFilePath}`);
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    const seedProducts = Array.isArray(seedData) ? seedData : seedData.products || [];

    console.log(`📦 Found ${seedProducts.length} products in seed file`);

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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
