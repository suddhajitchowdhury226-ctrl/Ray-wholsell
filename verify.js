require('dotenv').config();
const mongoose = require('mongoose');
async function run() {
  await mongoose.connect(process.env.DATABASE_URL, { family: 4, serverSelectionTimeoutMS: 10000 });
  const Product = require('./Models/productModel');
  const samples = await Product.find({ ingredient: { $exists: true, $ne: null } }).limit(3).select('name description ingredient lookup_code');
  samples.forEach(p => {
    console.log('Name:', p.name?.substring(0,50));
    console.log('Desc:', p.description?.substring(0,60));
    console.log('Ingr:', p.ingredient?.substring(0,80));
    console.log('UPC:', p.lookup_code);
    console.log();
  });
  const withIngr = await Product.countDocuments({ ingredient: { $exists: true, $ne: null } });
  console.log(`Products with ingredients: ${withIngr}/360`);
  await mongoose.disconnect();
}
run().catch(e => console.error(e.message));
