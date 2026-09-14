const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./Models/user');

async function createProperAdmin() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected');

    console.log('\n🔧 Creating proper admin account...\n');

    // Generate unique phone
    const uniquePhone = `99${Math.random().toString().slice(2, 10)}`;

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);

    // Delete existing
    await User.deleteOne({ email: 'admin@raywholesale.com' });

    // Create new admin
    const adminDoc = new User({
      email: 'admin@raywholesale.com',
      password: hashedPassword, // Already hashed
      name: 'Admin User',
      role: 'admin',
      phone: uniquePhone
    });

    // Skip validation to save directly
    await adminDoc.save({ validateBeforeSave: false });

    console.log('✅ Admin account created successfully!');
    console.log('   Email: admin@raywholesale.com');
    console.log('   Password: Admin@123456 (hashed)');
    console.log('   Role: admin');
    console.log('   Phone:', uniquePhone);
    console.log('\n✅ Now try logging in!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createProperAdmin();
