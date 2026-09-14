/**
 * Update Product Names Script
 * 
 * This script updates product names in MongoDB from old names to new RHL Product Names
 * 
 * Run: node update-product-names.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/rayWholeSale';

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
  }]
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// New product names mapping (old_name => new_name)
const nameUpdates = {
  // Powder Capsules
  'Adrenal Rx Powder Capsules': 'Adaptogen Vitality Complex',
  'Aloe Vera Plus Powder Capsules': 'Aloe Digestive Comfort',
  'Andrographis Powder Capsules': 'Chuan Xin Lian Andrographis',
  'Apple Cider Vinegar Powder Capsules': 'Organic Apple Cider Vinegar',
  'Ashwagandha Powder Capsules': 'Withanolide Ashwagandha',
  'Astragalus Powder Capsules': 'Full Spectrum Astragalus',
  'Bacopa Powder Capsules': 'Bacoside Bacopa',
  'Beet Root COG Powder Capsules': 'Organic Beet Root',
  'Bilberry Powder Capsules Standardized': 'Anthocyanin Bilberry',
  'Bitter Melon Powder Capsules': 'Concentrated Bitter Melon',
  'Black Cohosh Powder Capsules': 'Full Spectrum Black Cohosh',
  'Black Walnut COG Powder Capsules': 'Full Spectrum Black Walnut',
  'Blood Sugar Harmony Powder Capsule': 'Metabolic Glucose Support',
  'Brain Mushroom Support COG Powder Capsules': 'Cognitive Focus Complex',
  'Candida Clean Powder Capsules': 'Intestinal Botanical Balance',
  'Cascara Sagrada Powder Capsules': 'Full Spectrum Cascara Sagrada',
  'Cat\'s Claw Powder Capsules': 'Full Spectrum Cat\'s Claw',
  'Cayenne Powder Capsules': 'Full Spectrum Cayenne',
  'Chaga Powder Capsules': 'Wildcrafted Chaga',
  'Chaste Tree Powder Capsules': 'Full Spectrum Chaste Tree',
  'Chlorella Powder Capsules': 'Broken-Cell Chlorella',
  'Cinnamon Powder Capsules': 'Full Spectrum Cinnamon',
  'Clove COG Powder Capsules': 'Full Spectrum Clove',
  'Colon Clean Powder Capsules': 'Digestive Transit Support',
  'Cordyceps Powder Capsules': 'Mycelial Cordyceps',
  'Cranberry Powder Capsules': 'Proanthocyanidin Cranberry',
  'Cranberry + D-Mannose Powder Capsules': 'Urinary Tract Support',
  'Dandelion Powder Capsules': 'Full Spectrum Dandelion',
  'Dong Quai Powder Capsules': 'Full Spectrum Dong Quai',
  'D-Mannose Powder Capsules': 'Pure D-Mannose',
  'Echinacea Powder Capsules': 'Full Spectrum Echinacea',
  'Echinacea-Goldenseal Powder Capsules': 'Immune Botanical Complex',
  'Elderberry Plus Powder Capsules': 'Wildcrafted Elderberry Plus',
  'Energy Mushroom Support COG PowderCapsules': 'Energy & Vitality Complex',
  'Fenugreek Powder Capsules': 'Full Spectrum Fenugreek',
  'Garlic Powder Capsules': 'Full Spectrum Garlic',
  'Ginger Powder Capsules': 'Full Spectrum Ginger',
  'Ginkgo Powder Capsules': 'Flavone Ginkgo',
  'Ginseng, American Powder Capsules': 'Full Spectrum Ginseng, American',
  'Glucosamine & Chondroitin Powder Capsules': 'Joint Comfort Complex',
  'Goldenseal Powder Capsules': 'Full Spectrum Goldenseal',
  'Gotu Kola Powder Capsules': 'Full Spectrum Gotu Kola',
  'Graviola (Soursop) Leaf Powder Capsules': 'Full Spectrum Graviola (Soursop) Leaf',
  'Green Coffee Bean Powder Capsules': 'Chlorogenic Green Coffee Bean',
  'Green Tea Powder Capsules Standardized': 'Polyphenol Green Tea',
  'Hair Skin Nails Powder Capsules': 'Hair, Skin & Nail Support',
  'Hawthorn Powder Capsules': 'Full Spectrum Hawthorn',
  'Holy Basil Powder Capsules Standardized': 'Ursolic Holy Basil',
  'Hyaluronic Acid Supreme': 'Hyaluronic Acid Complex',
  'Immuno Well Rx Powder Capsules': 'Immune Botanical Complex',
  'Inflacalm Powder Capsules': 'Joint Comfort Complex',
  'Irish Moss Powder Capsules': 'Full Spectrum Irish Moss',
  'Kava Powder Capsules': 'Vanuatu Kava',
  'Kava Gold With Albizzia Powder Capsules': 'Calm & Resilience Complex',
  'Kelp Powder Capsules': 'Full Spectrum Kelp',
  'Lemon Balm COG Powder Capsules': 'Full Spectrum Lemon Balm',
  'Lion\'s Mane COG Powder Capsules': 'Organic Lion\'s Mane',
  'Lion\'s Mane 2,000 mg COG Powder Capsules': 'Organic Lion\'s Mane 2,000 mg',
  'Liver Detox Powder Capsules': 'Liver Wellness Complex',
  'L-Theanine Powder Capsules': 'Pure L-Theanine',
  'Maca Powder Capsules': 'Andean Maca',
  'Milk Thistle Powder Capsules Standardized': 'Silymarin Milk Thistle',
  'Moringa Powder Capsules': 'Organic Moringa',
  'Mullein Powder Capsules': 'Wildcrafted Mullein',
  'Mushroom Immune Powder Capsules': 'Immune Botanical Complex',
  'Neem Powder Capsules': 'Full Spectrum Neem',
  'Nettles Powder Capsules': 'Full Spectrum Nettles',
  'Nootropic Boost Powder Capsules': 'Cognitive Focus Complex',
  'Olive Leaf Powder Capsules Standardized': 'Oleuropein Olive Leaf',
  'Oregano Supreme Powder Capsules': 'Oregano Complex',
  'Paracide Powder Capsules': 'Intestinal Botanical Balance',
  'Passion Flower Powder Capsules': 'Organic Passion Flower',
  'Pau D\' Arco Powder Capsules': 'Full Spectrum Pau D\' Arco',
  'Red Yeast Rice With CoQ10 Powder Capsules': 'Ubiquinone CoQ10',
  'Reishi COG Powder Capsules': 'Organic Reishi',
  'Rhodiola Powder Capsules': 'Rosavin Rhodiola',
  'Serene Mushroom Support Powder Capsules': 'Calm & Resilience Complex',
  'Sleep Powder Capsules': 'Rest & Sleep Support',
  'Spirulina Powder Capsules': 'Organic Spirulina',
  'Stamina Powder Capsules': 'Energy & Vitality Complex',
  'St. John\'s Wort Powder Capsules': 'Hypericin St. John\'s Wort',
  'Stress Mushroom Support COG Powder Capsules': 'Calm & Resilience Complex',
  'Thyroid Powder Capsules': 'Thyroid Nutrient Support',
  'Triphala Powder Capsules': 'Organic Triphala',
  'Turkey Tail COG Powder Capsules': 'Organic Turkey Tail',
  'Turmeric Powder Capsules Standardized': 'Concentrated Turmeric Standardized',
  'Turmeric Plus AM Ache Relief Powder Capsules': 'Joint Comfort Complex',
  'Turmeric Plus Heart Complete with CoQ10 Powder Capsules': 'Cardiovascular Support Complex',
  'Turmeric Plus Joint Health Powder Capsules': 'Joint Comfort Complex',
  'Turmeric Plus PM Ache Relief Powder Capsules': 'Joint Comfort Complex',
  'Valerian Powder Capsules': 'Full Spectrum Valerian',
  'Vein Health Powder Capsules': 'Vein & Circulation Support',
  'Wormwood COG Powder Capsules': 'Full Spectrum Wormwood'
};

async function updateProductNames() {
  try {
    console.log('📝 Starting product name update...\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const stats = {
      updated: 0,
      notFound: 0,
      skipped: 0,
      errors: 0
    };

    console.log('🚀 Updating product names...\n');

    for (const [oldName, newName] of Object.entries(nameUpdates)) {
      try {
        const result = await Product.findOneAndUpdate(
          { name: oldName },
          { name: newName },
          { new: true }
        );

        if (result) {
          console.log(`  ✓ Updated: "${oldName}" → "${newName}"`);
          stats.updated++;
        } else {
          console.warn(`  ⚠️  Not found: "${oldName}"`);
          stats.notFound++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating "${oldName}":`, error.message);
        stats.errors++;
      }
    }

    console.log('\n✅ Update complete!\n');
    console.log('📊 Statistics:');
    console.log(`  • Products updated: ${stats.updated}`);
    console.log(`  • Products not found: ${stats.notFound}`);
    console.log(`  • Errors: ${stats.errors}`);

    console.log('\n✅ All product names have been updated!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateProductNames();
