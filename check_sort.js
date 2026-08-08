require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL, { family: 4, serverSelectionTimeoutMS: 10000 }).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
  const first3 = await Product.find({}).sort({ item_number: 1 }).limit(3).select('item_number');
  const last3  = await Product.find({}).sort({ item_number: 1 }).skip(357).limit(3).select('item_number');
  console.log('String sort first 3:', first3.map(p => p.item_number));
  console.log('String sort last 3:', last3.map(p => p.item_number));
  await mongoose.disconnect();
});