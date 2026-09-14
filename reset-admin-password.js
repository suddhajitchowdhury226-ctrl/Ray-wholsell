const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');

async function resetAdminPassword() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected');

    console.log('\n🔐 Resetting admin password...\n');
    
    // Use direct update to bypass validation
    const result = await User.findOneAndUpdate(
      { email: 'admin@raywholesale.com' },
      { password: 'Admin@123456' },
      { new: true }
    );

    if (!result) {
      console.log('❌ Admin account not found');
      process.exit(1);
    }

    console.log('✅ Admin password reset successfully!\n');
    console.log('📧 Email: admin@raywholesale.com');
    console.log('🔑 Password: Admin@123456\n');
    console.log('Use these credentials to login to admin panel:');
    console.log('https://ray-admin-eight.vercel.app/login\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
