const mongoose = require('mongoose');
const Category    = require('./Models/categoryModel');
const Subcategory = require('./Models/subcategoryModel');
const User        = require('./Models/user');
require('dotenv').config();

// ── Full department -> categories mapping from RHL CSV ────────────────────────
const DEPARTMENTS = {"AROMA THERAPY": ["CARRIER OIL", "ESSENTIAL OILS"], "BLOOD SUGAR SUPPORT": ["INSULIN SUPPORT"], "BODY OIL": ["CARRIER OIL"], "CARDIOVASCULAR SUPPORT": ["CHOLESTEROL", "CIRCULARTORY SUPPORT", "GINSENG ENERGRY", "HEART SUPPORT"], "CHILDREN"S HEALTH": ["CHILDRENS VITAMINS", "KIDE ANXIETY"], "DIGESTION - DETOX": ["CLEANSING - COLON SUPPORT", "DETOX", "DETOX - LIVER CLENSES", "DIGESTIVE AID - ENZYMES", "INTESTINAL SUPPORT", "KIDNNEY - URINARY - LYMPH SUPP", "YEAST - BACTERIA - FUNGAL DETO"], "HERBAL SUPPLEMENTS A - Z": ["BRAIN AND NERVE SUPPORT", "HERBAL SUPPLEMENT", "LIQUID HERBS"], "HORMONAL HEALTH": ["WOMENS HEALTH"], "HYGIENE": ["MOUTHWASH", "SANITIZER"], "IMMUNE SYSTEM SUPPORT": ["BLACK SEED", "IMMUNE ANTIOXIDANT SUPPORT", "IMMUNE SUPPORT", "MUSHROOM", "RESPIRATORY HERBS/BRONCHIAL SU", "SINUS SUPPORT -   ALLERGIES SU"], "JOINT SUPPORT": ["INFLAMMATION", "JOINT AND ARTHRITIS", "JOINT HEALTH", "PAIN MANAGMENT"], "LIQUID HERBS A - Z": ["LIQUID SUPPLEMENT"], "MEN -  WOMAN HEALTH": ["ADRENAL SUPPORT", "GLANDULAR SUPPORT", "HORMONAL HEALTH", "MEN & WOMEN hEALTH", "MEN AND WOMEN GLANDULAR SUPPOR", "MEN"S HEALTH", "THYROID SUPPORT", "WEIGHT MANAGEMENT", "WOMEN HEALTH"], "MINERALS": ["IRON", "ZINC"], "NERVOUS SYSTEM": ["ALCOHOLISM", "ANXIETY SUPPORT", "BRAIN -  NERVE SUPPORT -  MENT", "EYE CARE", "HEAD - AID", "SLEEP", "STRESS ANXIETY SUPPORT", "STRESS SUPPORT"], "PANTRY": ["IRISH SEA MOSS", "SWEETENER"], "PERSONAL SUPPORT": ["EAR", "FIRST AID", "HAIR", "HAIR - SKIN - NAILS", "SKIN"], "SUPERFOOD": ["CAPSULES", "JUICE", "LOOSE HERBS", "SEA MOSS"], "VITAMINS A - Z": ["B VITAMINS", "C VITAMINS", "D VITAMINS", "VITAMIN A-Z"]};

async function seedCategories() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected to MongoDB');

  // Find an admin user to set as createdBy
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne({});
  }
  if (!adminUser) {
    console.error('No user found — create an admin user first');
    process.exit(1);
  }
  console.log('Using createdBy:', adminUser.email);

  let created = 0;
  let skipped = 0;

  for (const [dept, categoryNames] of Object.entries(DEPARTMENTS)) {
    for (const catName of categoryNames) {
      // Upsert category
      let category = await Category.findOne({ name: catName.trim() });
      if (!category) {
        category = await Category.create({
          name:       catName.trim(),
          department: dept,
          createdBy:  adminUser._id,
          subcategories: [],
        });
        created++;
        console.log('Created category:', catName, '(dept:', dept + ')');
      } else {
        // Update department if missing
        if (!category.department) {
          category.department = dept;
          await category.save();
          console.log('Updated dept for:', catName);
        }
        skipped++;
      }
    }
  }

  console.log('\nSeed complete:', created, 'created,', skipped, 'already existed');
  await mongoose.disconnect();
}

seedCategories().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
