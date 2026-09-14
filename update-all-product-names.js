/**
 * FINAL PRODUCT NAME UPDATE SCRIPT
 * 
 * This script reads ALL 408 product names from rhl_products_with_bin_location.json
 * and updates MongoDB products collection with correct names by rhlId.
 * 
 * This is the definitive fix for displaying correct product names on frontend.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB using DATABASE_URL from .env
const mongoUri = process.env.DATABASE_URL || 'mongodb+srv://raymandata_db_user:SCIzh0keqOjJFTNX@cluster0.0ooleyg.mongodb.net/test?appName=Cluster0';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✓ Connected to MongoDB\n'))
  .catch(err => {
    console.error('✗ MongoDB connection failed:', err);
    process.exit(1);
  });

const Product = require('./Models/productModel');

async function updateAllProductNames() {
  try {
    // Read seed file with all 408 correct product names
    let seedFilePath = path.join(__dirname, '../rhl_products_with_bin_location.json');
    
    if (!fs.existsSync(seedFilePath)) {
      console.error(`✗ Seed file not found at: ${seedFilePath}`);
      console.error('Looking for it in Ray Full System folder...');
      // Try alternate location (one level up from Ray-wholsell-1)
      seedFilePath = path.join(__dirname, '..', 'rhl_products_with_bin_location.json');
      if (!fs.existsSync(seedFilePath)) {
        console.error(`✗ Seed file not found at alternate location either: ${seedFilePath}`);
        process.exit(1);
      }
    }

    console.log(`\n📂 Reading seed file: ${seedFilePath}`);
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    console.log(`✓ Loaded ${seedData.length} products from seed file\n`);

    // Create a mapping of rhlId → correct name
    const nameMapping = {};
    for (const product of seedData) {
      if (product.rhlId && product.name) {
        nameMapping[product.rhlId] = product.name;
      }
    }

    console.log(`✓ Created mapping for ${Object.keys(nameMapping).length} products\n`);

    // Update MongoDB with correct names
    let updateCount = 0;
    let errorCount = 0;
    const updates = [];

    for (const [rhlId, correctName] of Object.entries(nameMapping)) {
      try {
        const result = await Product.findOneAndUpdate(
          { rhlId: parseInt(rhlId) },
          { name: correctName },
          { new: true }
        );

        if (result) {
          updateCount++;
          console.log(`✓ Updated rhlId ${rhlId}: "${result.name}"`);
        } else {
          console.log(`⚠ No product found with rhlId ${rhlId}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`✗ Error updating rhlId ${rhlId}:`, err.message);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PRODUCT NAME UPDATE COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✓ Successfully updated: ${updateCount} products`);
    console.log(`✗ Errors encountered: ${errorCount}`);
    console.log(`Total from seed file: ${seedData.length}`);
    console.log(`${'='.repeat(60)}\n`);

    // Verify a few updates
    console.log('📋 Verification (sample of updated products):\n');
    const sampleRhlIds = [202, 204, 210];
    for (const rhlId of sampleRhlIds) {
      const product = await Product.findOne({ rhlId });
      if (product) {
        const seedProduct = seedData.find(p => p.rhlId === rhlId);
        const match = product.name === seedProduct.name ? '✓' : '✗';
        console.log(`${match} rhlId ${rhlId}: "${product.name}"`);
      }
    }

    console.log('\n✓ Update script completed. Frontend should now display correct product names.');
    console.log('  Remember to: 1) Restart backend, 2) Clear browser cache, 3) Hard refresh (Ctrl+Shift+R)\n');

  } catch (err) {
    console.error('✗ Fatal error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

// Run the update
updateAllProductNames();
