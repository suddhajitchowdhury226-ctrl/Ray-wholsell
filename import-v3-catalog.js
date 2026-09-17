/**
 * Import Script: Upsert from rhl-product-catalog-seed-v3.json
 *
 * Changes vs previous imports:
 *  - product.name = manufacturer PRODUCT NAME (no rhlProductName anywhere)
 *  - variant.binLocation added (209/484 variants have a value; rest are null = "not yet confirmed")
 *  - Matches products on rhlId, variants on itemNumber
 *  - Removes rhlProductName field from any existing records (unsets it)
 *
 * Run: node import-v3-catalog.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI =
  process.env.DATABASE_URL ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/rayWholeSale';

const SEED_FILE = path.join(__dirname, 'rhl-product-catalog-seed-v3.json');

// ── Inline schema (avoids pulling in the full model with its hooks) ──────────
const variantSchema = new mongoose.Schema({
  size:            { type: String, required: true },
  itemNumber:      { type: String, required: true },
  rhlUpc:          { type: String, default: null },
  manufacturerUpc: { type: String, default: null },
  price:           { type: Number, default: null },
  binLocation:     { type: String, default: null },
  status:          { type: String, default: 'active' },
}, { _id: true });

const productSchema = new mongoose.Schema({
  rhlId:           { type: Number, required: true, unique: true, index: true },
  name:            { type: String, required: true },
  category:        { type: String, required: true },
  type:            { type: String, default: null },
  description:     { type: String, default: null },
  ingredients:     { type: String, default: null },
  status:          { type: String, default: 'active' },
  variants:        [variantSchema],
  // legacy fields kept as-is
  rhlProductId:    String,
  item_number:     String,
  sku:             String,
  buyPrice:        Number,
  sellPrice:       Number,
  wholesaleSellPrice: Number,
  stock:           Number,
  bin_location:    String,
  images:          mongoose.Schema.Types.Mixed,
  legacyImages:    [String],
  categoryRef:     mongoose.Schema.Types.ObjectId,
  subcategory:     mongoose.Schema.Types.ObjectId,
  brand:           mongoose.Schema.Types.ObjectId,
  createdBy:       mongoose.Schema.Types.ObjectId,
}, { timestamps: true, strict: false }); // strict:false so we can $unset rhlProductName

const Product = mongoose.model('Product', productSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVariants(rawVariants) {
  return rawVariants.map(v => ({
    size:            v.size,
    itemNumber:      v.itemNumber,
    rhlUpc:          v.rhlUpc   ?? null,
    manufacturerUpc: v.manufacturerUpc ?? null,
    price:           v.price    ?? null,
    binLocation:     v.binLocation ?? null,   // null = not yet confirmed, not missing
    status:          v.status   ?? 'active',
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RHL Product Catalog v3 — Upsert Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌  Seed file not found: ${SEED_FILE}`);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  console.log(`📄  Loaded ${seedData.length} products from seed file`);

  const totalVariants = seedData.reduce((n, p) => n + p.variants.length, 0);
  const withBin = seedData.reduce(
    (n, p) => n + p.variants.filter(v => v.binLocation !== null).length, 0
  );
  console.log(`    └─ ${totalVariants} variants total  (${withBin} with binLocation, ${totalVariants - withBin} still null)\n`);

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  // ── Step 1: strip rhlProductName from every existing record that has it ──
  const stripped = await Product.updateMany(
    { rhlProductName: { $exists: true } },
    { $unset: { rhlProductName: '' } }
  );
  if (stripped.modifiedCount > 0) {
    console.log(`🧹  Removed rhlProductName from ${stripped.modifiedCount} existing records`);
  } else {
    console.log('✅  No existing records had rhlProductName — nothing to strip');
  }
  console.log('');

  // ── Step 2: upsert each product ──────────────────────────────────────────
  const stats = { inserted: 0, updated: 0, errors: 0, nullPriceVariants: [] };

  for (const p of seedData) {
    try {
      const variants = buildVariants(p.variants);

      // Collect null-price variants for the report
      variants.forEach(v => {
        if (v.price === null) {
          stats.nullPriceVariants.push({
            rhlId: p.rhlId, name: p.name,
            size: v.size, itemNumber: v.itemNumber,
          });
        }
      });

      const update = {
        $set: {
          name:        p.name,         // manufacturer PRODUCT NAME — no rhlProductName
          category:    p.category,
          type:        p.type   ?? null,
          description: p.description ?? null,
          ingredients: p.ingredients ?? null,
          status:      p.status ?? 'active',
          variants,
        },
        $unset: { rhlProductName: '' }, // belt-and-suspenders: remove on upsert too
      };

      const result = await Product.findOneAndUpdate(
        { rhlId: p.rhlId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // findOneAndUpdate with upsert: if the doc didn't exist before it gets
      // a fresh _id; otherwise it was updated. We use createdAt ≈ updatedAt to detect new.
      const isNew = Math.abs(result.createdAt - result.updatedAt) < 1000;
      if (isNew) stats.inserted++;
      else        stats.updated++;

    } catch (err) {
      console.error(`  ❌  rhlId ${p.rhlId} (${p.name}): ${err.message}`);
      stats.errors++;
    }
  }

  // ── Step 3: report ────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Import complete — Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Products inserted  : ${stats.inserted}`);
  console.log(`  Products updated   : ${stats.updated}`);
  console.log(`  Errors             : ${stats.errors}`);
  console.log(`  Total processed    : ${stats.inserted + stats.updated + stats.errors}`);
  console.log(`  Variants total     : ${totalVariants}`);
  console.log(`  Variants w/ binLoc : ${withBin}`);
  console.log(`  Variants null price: ${stats.nullPriceVariants.length}`);

  if (stats.nullPriceVariants.length > 0) {
    console.log('\n⚠️   Variants with null price (no action needed — expected from source):');
    stats.nullPriceVariants.slice(0, 20).forEach(v =>
      console.log(`    RHL#${v.rhlId}  ${v.name}  [${v.size}]  item#${v.itemNumber}`)
    );
    if (stats.nullPriceVariants.length > 20) {
      console.log(`    … and ${stats.nullPriceVariants.length - 20} more`);
    }
  }

  if (stats.errors > 0) {
    console.log(`\n❌  ${stats.errors} products failed — check errors above`);
    process.exitCode = 1;
  } else {
    console.log('\n✅  All products upserted successfully');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
