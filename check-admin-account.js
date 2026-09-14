const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');

async function checkAdmin() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected');

    console.log('\n📊 Checking for admin accounts...\n');
    const admins = await User.find({ role: 'admin' })
      .select('_id email name role createdAt')
      .sort({ createdAt: -1 });

    if (admins.length === 0) {
      console.log('❌ No admin accounts found!');
      console.log('Creating a test admin account...\n');
      
      const testAdmin = new User({
        email: 'admin@rayshealthyliving.com',
        password: 'Admin@123456', // Will be hashed by model pre-save
        name: 'Admin User',
        role: 'admin',
        phone: '1234567890'
      });

      await testAdmin.save();
      console.log('✅ Admin account created!');
      console.log('   Email: admin@rayshealthyliving.com');
      console.log('   Password: Admin@123456');
    } else {
      console.log(`✅ Found ${admins.length} admin account(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. Email: ${admin.email}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log('');
      });
    }

    console.log('✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();
