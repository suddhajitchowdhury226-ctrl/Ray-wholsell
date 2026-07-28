/**
 * Image Migration Script
 * Uploads all local product images to Cloudinary and updates MongoDB
 * 
 * Usage:
 *   CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=xxx DATABASE_URL=mongodb+srv://... node migrate-images.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ---- CONFIG ----
const IMAGES_DIR = path.join(__dirname, '../ray/Main-Backend-main/uploads/productImages');
// ----------------

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ProductSchema = new mongoose.Schema({ images: [String] }, { strict: false });
const Product = mongoose.model('Product', ProductSchema, 'products');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: Set DATABASE_URL env var');
    process.exit(1);
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('ERROR: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('✅ Connected to MongoDB');

  const products = await Product.find({ images: { $exists: true, $ne: [] } });
  console.log(`📦 Found ${products.length} products with images`);

  // Build a map of filename -> cloudinary URL to avoid re-uploading
  const uploadedMap = {};
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    let changed = false;
    const newImages = [];

    for (const imgPath of product.images) {
      // Already a Cloudinary URL or full http URL — skip
      if (imgPath && imgPath.startsWith('http')) {
        newImages.push(imgPath);
        continue;
      }

      // Extract just the filename from path like "uploads/productImages/xxx.jpg"
      const filename = path.basename(imgPath);
      const localPath = path.join(IMAGES_DIR, filename);

      // Check if already uploaded this session
      if (uploadedMap[filename]) {
        newImages.push(uploadedMap[filename]);
        changed = true;
        continue;
      }

      // Check local file exists
      if (!fs.existsSync(localPath)) {
        console.log(`  ⚠️  File not found locally: ${filename}`);
        newImages.push(imgPath); // keep original
        skipped++;
        continue;
      }

      try {
        const result = await cloudinary.uploader.upload(localPath, {
          folder: 'ray-wholsell/productImages',
          use_filename: true,
          unique_filename: false,
          overwrite: false,
        });
        uploadedMap[filename] = result.secure_url;
        newImages.push(result.secure_url);
        changed = true;
        console.log(`  ✅ Uploaded: ${filename}`);
      } catch (err) {
        console.log(`  ❌ Failed: ${filename} - ${err.message}`);
        newImages.push(imgPath);
        failed++;
      }
    }

    if (changed) {
      await Product.updateOne({ _id: product._id }, { $set: { images: newImages } });
      updated++;
    }
  }

  console.log('\n📊 Migration complete:');
  console.log(`   ✅ Products updated: ${updated}`);
  console.log(`   ⚠️  Files not found: ${skipped}`);
  console.log(`   ❌ Upload failures: ${failed}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
