const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.DATABASE_URL;

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

    // Find all retailers
    const retailers = await User.find({ role: 'retailer' }).select('name email role').limit(5);
    
    console.log(`Found ${retailers.length} retailer users:\n`);
    retailers.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}\n`);
    });

    if (retailers.length === 0) {
      console.log('❌ No retailer users found! Creating a test retailer...\n');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const testRetailer = await User.create({
        name: 'Test Retailer',
        email: 'retailer@test.com',
        password: hashedPassword,
        role: 'retailer',
        phone: '1234567890',
        isActive: true
      });
      
      console.log('✅ Created test retailer:');
      console.log(`   Email: ${testRetailer.email}`);
      console.log(`   Password: password123`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
