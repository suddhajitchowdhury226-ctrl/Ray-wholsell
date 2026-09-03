const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const Product = require('./Models/productModel');
  const Category = require('./Models/categoryModel');
  
  const productCount = await Product.countDocuments();
  const categories = await Category.find().select('name');
  
  console.log('✅ Total products in database:', productCount);
  console.log('\n📁 Categories created:');
  categories.forEach(cat => console.log('   -', cat.name));
  
  console.log('\n📊 Sample products by category:');
  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat._id });
    console.log(`   ${cat.name}: ${count} products`);
  }
  
  process.exit(0);
}).catch(err => { 
  console.error('Error:', err.message); 
  process.exit(1); 
});
