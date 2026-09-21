const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.DATABASE_URL;

async function createTestRetailer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

    // Check if test retailer already exists
    const existing = await User.findOne({ email: 'testretailer@test.com' });
    
    if (existing) {
      console.log('📝 Test retailer already exists, updating password...');
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      await User.updateOne(
        { email: 'testretailer@test.com' },
        { password: hashedPassword, isActive: true }
      );
      console.log('✅ Updated test retailer password\n');
    } else {
      console.log('✨ Creating new test retailer...');
      const hashedPassword = await bcrypt.hash('Test@1234', 10);
      
      await User.create({
        name: 'Test Retailer',
        email: 'testretailer@test.com',
        password: hashedPassword,
        role: 'retailer',
        phone: '9999999999',  // Unique phone number
        isActive: true
      });
      console.log('✅ Created test retailer\n');
    }

    console.log('🔑 Test Retailer Credentials:');
    console.log('   Email: testretailer@test.com');
    console.log('   Password: Test@1234');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestRetailer();
