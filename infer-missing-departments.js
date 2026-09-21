require('dotenv').config();
const mongoose = require('mongoose');
const productModel = require('./Models/productModel');

// Mapping from categories to departments based on CSV analysis
const categoryToDepartment = {
  // Vitamins
  'B VITAMINS': 'VITAMINS A - Z',
  'C VITAMINS': 'VITAMINS A - Z',
  'D VITAMINS': 'VITAMINS A - Z',
  'VITAMIN A-Z': 'VITAMINS A - Z',
  
  // Joint Support
  'PAIN MANAGMENT': 'JOINT SUPPORT',
  'JOINT HEALTH': 'JOINT SUPPORT',
  'JOINT AND ARTHRITIS': 'JOINT SUPPORT',
  'INFLAMMATION': 'JOINT SUPPORT',
  
  // Personal Support
  'HAIR': 'PERSONAL SUPPORT',
  'HAIR - SKIN - NAILS': 'PERSONAL SUPPORT',
  'EAR': 'PERSONAL SUPPORT',
  'FIRST AID': 'PERSONAL SUPPORT',
  
  // Hygiene
  'MOUTHWASH': 'HYGIENE',
  
  // Aroma Therapy
  'ESSENTIAL OILS': 'AROMA THERAPY',
  'CARRIER OIL': 'AROMA THERAPY',
  
  // Body Oil
  'CARRIER OIL': 'BODY OIL',
  
  // Pantry/Superfood
  'SWEETENER': 'PANTRY',
  'IRISH SEA MOSS': 'PANTRY',
  'LOOSE HERBS': 'SUPERFOOD',
  'CAPSULES': 'SUPERFOOD',
  'JUICE': 'SUPERFOOD',
  
  // Herbal Supplements
  'BRAIN AND NERVE SUPPORT': 'HERBAL SUPPLEMENTS A - Z',
  'LIQUID HERBS': 'LIQUID HERBS A - Z',
  'HERBAL SUPPLEMENT': 'HERBAL SUPPLEMENTS A - Z',
  'LIQUID SUPPLEMENT': 'LIQUID HERBS A - Z',
  
  // Nervous System
  'STRESS SUPPORT': 'NERVOUS SYSTEM',
  'BRAIN -  NERVE SUPPORT -  MENT': 'NERVOUS SYSTEM',
  'STRESS ANXIETY SUPPORT': 'NERVOUS SYSTEM',
  'ANXIETY SUPPORT': 'NERVOUS SYSTEM',
  'EYE CARE': 'NERVOUS SYSTEM',
  'HEAD - AID': 'NERVOUS SYSTEM',
  'SLEEP': 'NERVOUS SYSTEM',
  
  // Minerals
  'ZINC': 'MINERALS',
  'IRON': 'MINERALS',
  
  // Children's Health
  'CHILDRENS VITAMINS': "CHILDREN'S HEALTH",
  'KIDE ANXIETY': "CHILDREN'S HEALTH",
  
  // Digestion & Detox
  'INTESTINAL SUPPORT': 'DIGESTION - DETOX',
  'CLEANSING - COLON SUPPORT': 'DIGESTION - DETOX',
  'DIGESTIVE AID - ENZYMES': 'DIGESTION - DETOX',
  'DETOX - LIVER CLENSES': 'DIGESTION - DETOX',
  'DETOX': 'DIGESTION - DETOX',
  'YEAST - BACTERIA - FUNGAL DETO': 'DIGESTION - DETOX',
  'KIDNNEY - URINARY - LYMPH SUPP': 'DIGESTION - DETOX',
  
  // Men & Women Health
  'GLANDULAR SUPPORT': 'MEN -  WOMAN HEALTH',
  'WOMEN HEALTH': 'MEN -  WOMAN HEALTH',
  'HORMONAL HEALTH': 'MEN -  WOMAN HEALTH',
  'MEN AND WOMEN GLANDULAR SUPPOR': 'MEN -  WOMAN HEALTH',
  "MEN'S HEALTH": 'MEN -  WOMAN HEALTH',
  'MEN & WOMEN hEALTH': 'MEN -  WOMAN HEALTH',
  'ADRENAL SUPPORT': 'MEN -  WOMAN HEALTH',
  'THYROID SUPPORT': 'MEN -  WOMAN HEALTH',
  'WEIGHT MANAGEMENT': 'MEN -  WOMAN HEALTH',
  
  // Immune System
  'IMMUNE SUPPORT': 'IMMUNE SYSTEM SUPPORT',
  'MUSHROOM': 'IMMUNE SYSTEM SUPPORT',
  'IMMUNE ANTIOXIDANT SUPPORT': 'IMMUNE SYSTEM SUPPORT',
  'BLACK SEED': 'IMMUNE SYSTEM SUPPORT',
  'RESPIRATORY HERBS/BRONCHIAL SU': 'IMMUNE SYSTEM SUPPORT',
  'SINUS SUPPORT -   ALLERGIES SU': 'IMMUNE SYSTEM SUPPORT',
  
  // Cardiovascular
  'HEART SUPPORT': 'CARDIOVASCULAR SUPPORT',
  'CHOLESTEROL': 'CARDIOVASCULAR SUPPORT',
  'CIRCULARTORY SUPPORT': 'CARDIOVASCULAR SUPPORT',
  'GINSENG ENERGRY': 'CARDIOVASCULAR SUPPORT',
  
  // Blood Sugar
  'INSULIN SUPPORT': 'BLOOD SUGAR SUPPORT',
  
  // Fresh Ground Veggie Capsules - default to Herbal Supplements
  'FRESH GROUND VEGGIE CAPSULES': 'HERBAL SUPPLEMENTS A - Z',
  'SINGLE HERBAL LIQUID EXTRACTS': 'LIQUID HERBS A - Z',
};

async function inferMissingDepartments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find products without department
    const productsWithoutDept = await productModel.find({ 
      $or: [
        { department: null },
        { department: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${productsWithoutDept.length} products without department\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of productsWithoutDept) {
      const category = product.category;
      const inferredDept = categoryToDepartment[category];

      if (inferredDept) {
        await productModel.updateOne(
          { _id: product._id },
          { $set: { department: inferredDept } }
        );
        updatedCount++;
        console.log(`✅ ${product.name}: ${category} → ${inferredDept}`);
      } else {
        skippedCount++;
        console.log(`⚠️ ${product.name}: No mapping for category "${category}"`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Update Complete!`);
    console.log(`   - Products updated: ${updatedCount}`);
    console.log(`   - Products skipped: ${skippedCount}`);
    console.log(`   - Total processed: ${productsWithoutDept.length}`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inferMissingDepartments();
