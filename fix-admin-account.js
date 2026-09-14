const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');

async function fixAdminAccount() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected');

    console.log('\n🔧 Fixing admin account...\n');
    
    // Generate unique phone
    const uniquePhone = `99${Math.random().toString().slice(2, 10)}`;
    
    // Delete and recreate admin with valid fields
    await User.deleteOne({ email: 'admin@raywholesale.com' });
    
    const newAdmin = new User({
      email: 'admin@raywholesale.com',
      password: 'Admin@123456',
      name: 'Admin User',
      role: 'admin',
      phone: uniquePhone
    });

    await newAdmin.save();
    console.log('✅ Admin account created/fixed!');
    console.log('   Email: admin@raywholesale.com');
    console.log('   Password: Admin@123456');
    console.log('   Phone:', uniquePhone);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminAccount();
