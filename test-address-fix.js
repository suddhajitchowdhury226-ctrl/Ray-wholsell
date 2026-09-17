const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');

async function testAddresses() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find a test user
    const users = await User.find({}).limit(5);
    
    console.log(`📊 Found ${users.length} users\n`);
    
    for (const user of users) {
      console.log(`👤 User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Addresses: ${user.addresses?.length || 0}`);
      
      if (user.addresses && user.addresses.length > 0) {
        console.log(`   📍 Addresses:`);
        user.addresses.forEach((addr, idx) => {
          console.log(`      ${idx + 1}. ${addr.title || 'No Title'} - ${addr.name}`);
          console.log(`         ${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.zipcode}`);
          console.log(`         Default: ${addr.isDefault ? 'Yes' : 'No'}`);
        });
      } else {
        console.log(`   ⚠️  No addresses found!`);
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAddresses();
