const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./Models/categoryModel');
const Brand = require('./Models/brandModel');

async function checkCategoriesAndBrands() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    const categories = await Category.find().limit(5);
    const brands = await Brand.find().limit(5);

    console.log('\n📂 Available Categories:');
    categories.forEach(cat => {
      console.log(`- ${cat._id} : ${cat.name}`);
    });

    console.log('\n🏷️ Available Brands:');
    brands.forEach(brand => {
      console.log(`- ${brand._id} : ${brand.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCategoriesAndBrands();