const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const Product = require('./Models/productModel');
  
  // Check products with prices and stock
  const samples = await Product.find().limit(5).select('name sellPrice buyPrice stock ingredient size');
  
  console.log('✅ Sample products with prices and stock:');
  samples.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.name}`);
    console.log(`   Price: $${p.sellPrice.toFixed(2)} | Buy: $${p.buyPrice.toFixed(2)} | Stock: ${p.stock}`);
    console.log(`   Size: ${p.size}`);
    if (p.ingredient) {
      console.log(`   Ingredient: ${p.ingredient.substring(0, 80)}...`);
    }
  });
  
  // Get statistics
  const totalProducts = await Product.countDocuments();
  const withPrices = await Product.countDocuments({ sellPrice: { $gt: 0 } });
  const inStock = await Product.countDocuments({ stock: { $gt: 0 } });
  const avgPrice = await Product.aggregate([
    { $match: { sellPrice: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: '$sellPrice' } } }
  ]);
  
  console.log(`\n\n📊 Database Statistics:`);
  console.log(`   Total products: ${totalProducts}`);
  console.log(`   Products with prices: ${withPrices}`);
  console.log(`   Products in stock: ${inStock}`);
  console.log(`   Average price: $${(avgPrice[0]?.avg || 0).toFixed(2)}`);
  
  process.exit(0);
}).catch(err => { 
  console.error('Error:', err.message); 
  process.exit(1); 
});
