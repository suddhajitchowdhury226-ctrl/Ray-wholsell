/**
 * Bulk Update Script: Update all product names from spreadsheet
 * 
 * This script directly updates MongoDB with the correct product names
 * from the master product list.
 * 
 * Run: node bulk-update-product-names.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';

// Product schema
const productSchema = new mongoose.Schema({
  rhlId: { type: Number, required: true, unique: true },
  name: String,
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Complete mapping of RHL ID to NEW product name (from master spreadsheet)
const productNameMappings = [
  // Powder Capsules (RHL 200-299)
  { rhlId: 200, name: "Adrenal Rx Powder Capsules" },
  { rhlId: 201, name: "Aloe Vera Plus Powder Capsules" },
  { rhlId: 202, name: "Andrographis Powder Capsules" },
  { rhlId: 203, name: "Apple Cider Vinegar Powder Capsules" },
  { rhlId: 204, name: "Ashwagandha Powder Capsules" },
  { rhlId: 205, name: "Astragalus Powder Capsules" },
  { rhlId: 206, name: "Bacopa Powder Capsules" },
  { rhlId: 207, name: "Beet Root COG Powder Capsules" },
  { rhlId: 208, name: "Bilberry Powder Capsules Standardized" },
  { rhlId: 209, name: "Bitter Melon Powder Capsules" },
  { rhlId: 210, name: "Black Cohosh Powder Capsules" },
  { rhlId: 211, name: "Black Walnut COG Powder Capsules" },
  { rhlId: 212, name: "Blood Sugar Harmony Powder Capsule" },
  { rhlId: 213, name: "Brain Mushroom Support COG Powder Capsules" },
  { rhlId: 214, name: "Candida Clean Powder Capsules" },
  { rhlId: 215, name: "Cascara Sagrada Powder Capsules" },
  { rhlId: 216, name: "Cat's Claw Powder Capsules" },
  { rhlId: 217, name: "Cayenne Powder Capsules" },
  { rhlId: 218, name: "Chaga Powder Capsules" },
  { rhlId: 219, name: "Chaste Tree Powder Capsules" },
  { rhlId: 220, name: "Chlorella Powder Capsules" },
  { rhlId: 221, name: "Cinnamon Powder Capsules" },
  { rhlId: 222, name: "Cinnamon Powder Capsules" },
  { rhlId: 223, name: "Clove COG Powder Capsules" },
  { rhlId: 224, name: "Colon Clean Powder Capsules" },
  { rhlId: 225, name: "Cordyceps Powder Capsules" },
  { rhlId: 226, name: "Cranberry Powder Capsules" },
  { rhlId: 227, name: "Cranberry + D-Mannose Powder Capsules" },
  { rhlId: 228, name: "Dandelion Powder Capsules" },
  { rhlId: 229, name: "Dong Quai Powder Capsules" },
  { rhlId: 230, name: "D-Mannose Powder Capsules" },
  { rhlId: 231, name: "Echinacea Powder Capsules" },
  { rhlId: 232, name: "Echinacea-Goldenseal Powder Capsules" },
  { rhlId: 233, name: "Elderberry Plus Powder Capsules" },
  { rhlId: 234, name: "Energy Mushroom Support COG PowderCapsules" },
  { rhlId: 235, name: "Fenugreek Powder Capsules" },
  { rhlId: 236, name: "Garlic Powder Capsules" },
  { rhlId: 237, name: "Ginger Powder Capsules" },
  { rhlId: 238, name: "Ginger Powder Capsules" },
  { rhlId: 239, name: "Ginkgo Powder Capsules" },
  { rhlId: 240, name: "Ginkgo Powder Capsules" },
  { rhlId: 241, name: "Ginseng, American Powder Capsules" },
  { rhlId: 242, name: "Glucosamine & Chondroitin Powder Capsules" },
  { rhlId: 243, name: "Goldenseal Powder Capsules" },
  { rhlId: 244, name: "Gotu Kola Powder Capsules" },
  { rhlId: 245, name: "Graviola (Soursop) Leaf Powder Capsules" },
  { rhlId: 246, name: "Green Coffee Bean Powder Capsules" },
  { rhlId: 247, name: "Green Tea Powder Capsules Standardized" },
  { rhlId: 248, name: "Hair Skin Nails Powder Capsules" },
  { rhlId: 249, name: "Hawthorn Powder Capsules" },
  { rhlId: 250, name: "Holy Basil Powder Capsules Standardized" },
  { rhlId: 251, name: "Hyaluronic Acid Supreme" },
  { rhlId: 252, name: "Immuno Well Rx Powder Capsules" },
  { rhlId: 253, name: "Inflacalm Powder Capsules" },
  { rhlId: 254, name: "Irish Moss Powder Capsules" },
  { rhlId: 255, name: "Kava Powder Capsules" },
  { rhlId: 256, name: "Kava Gold With Albizzia Powder Capsules" },
  { rhlId: 257, name: "Kelp Powder Capsules" },
  { rhlId: 258, name: "Lemon Balm COG Powder Capsules" },
  { rhlId: 259, name: "Lion's Mane COG Powder Capsules" },
  { rhlId: 260, name: "Lion's Mane COG Powder Capsules" },
  { rhlId: 261, name: "Lion's Mane 2,000 mg COG Powder Capsules" },
  { rhlId: 262, name: "Liver Detox Powder Capsules" },
  { rhlId: 263, name: "L-Theanine Powder Capsules" },
  { rhlId: 264, name: "Maca Powder Capsules" },
  { rhlId: 265, name: "Milk Thistle Powder Capsules Standardized" },
  { rhlId: 266, name: "Milk Thistle Powder Capsules Standardized" },
  { rhlId: 267, name: "Moringa Powder Capsules" },
  { rhlId: 268, name: "Mullein Powder Capsules" },
  { rhlId: 269, name: "Mushroom Immune Powder Capsules" },
  { rhlId: 270, name: "Neem Powder Capsules" },
  { rhlId: 271, name: "Nettles Powder Capsules" },
  { rhlId: 272, name: "Nootropic Boost Powder Capsules" },
  { rhlId: 273, name: "Olive Leaf Powder Capsules Standardized" },
  { rhlId: 274, name: "Oregano Supreme Powder Capsules" },
  { rhlId: 275, name: "Paracide Powder Capsules" },
  { rhlId: 276, name: "Passion Flower Powder Capsules" },
  { rhlId: 277, name: "Pau D' Arco Powder Capsules" },
  { rhlId: 278, name: "Red Yeast Rice With CoQ10 Powder Capsules" },
  { rhlId: 279, name: "Reishi COG Powder Capsules" },
  { rhlId: 280, name: "Rhodiola Powder Capsules" },
  { rhlId: 281, name: "Serene Mushroom Support Powder Capsules" },
  { rhlId: 282, name: "Sleep Powder Capsules" },
  { rhlId: 283, name: "Spirulina Powder Capsules" },
  { rhlId: 284, name: "Stamina Powder Capsules" },
  { rhlId: 285, name: "St. John's Wort Powder Capsules" },
  { rhlId: 286, name: "Stress Mushroom Support COG Powder Capsules" },
  { rhlId: 287, name: "Thyroid Powder Capsules" },
  { rhlId: 288, name: "Triphala Powder Capsules" },
  { rhlId: 289, name: "Turkey Tail COG Powder Capsules" },
  { rhlId: 290, name: "Turmeric Powder Capsules Standardized" },
  { rhlId: 291, name: "Turmeric Powder Capsules Standardized" },
  { rhlId: 292, name: "Turmeric Plus AM Ache Relief Powder Capsules" },
  { rhlId: 293, name: "Turmeric Plus Heart Complete with CoQ10 Powder Capsules" },
  { rhlId: 294, name: "Turmeric Plus Joint Health Powder Capsules" },
  { rhlId: 295, name: "Turmeric Plus PM Ache Relief Powder Capsules" },
  { rhlId: 296, name: "Valerian Powder Capsules" },
  { rhlId: 297, name: "Valerian Powder Capsules" },
  { rhlId: 298, name: "Vein Health Powder Capsules" },
  { rhlId: 299, name: "Wormwood COG Powder Capsules" },
];

async function bulkUpdateProductNames() {
  try {
    console.log('📝 Starting bulk product name update...\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log('🚀 Updating product names...\n');

    for (const mapping of productNameMappings) {
      try {
        const result = await Product.findOneAndUpdate(
          { rhlId: mapping.rhlId },
          { name: mapping.name },
          { new: true }
        );

        if (result) {
          updated++;
          console.log(`✓ RHL#${mapping.rhlId}: "${mapping.name}"`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating RHL#${mapping.rhlId}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Bulk update complete!\n');
    console.log('📊 Statistics:');
    console.log(`  • Updated: ${updated}`);
    console.log(`  • Skipped: ${skipped}`);
    console.log(`  • Errors: ${errors}`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

bulkUpdateProductNames();
