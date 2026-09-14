const mongoose = require('mongoose');
require('dotenv').config();

async function createValidAdmin() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected');

    // Connect to users collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('\n🔧 Creating valid admin account...\n');

    // Generate unique phone
    const uniquePhone = `99${Math.random().toString().slice(2, 10)}`;

    // Create admin user with all required fields
    const adminDoc = {
      email: 'admin@raywholesale.com',
      password: 'Admin@123456', // Will be hashed by pre-save
      name: 'Admin User',
      role: 'admin', // Valid role
      phone: uniquePhone,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Delete existing
    await usersCollection.deleteOne({ email: 'admin@raywholesale.com' });

    // Insert new
    const result = await usersCollection.insertOne(adminDoc);

    console.log('✅ Admin account created successfully!');
    console.log('   Email: admin@raywholesale.com');
    console.log('   Password: Admin@123456');
    console.log('   Role: admin');
    console.log('   Phone:', uniquePhone);
    console.log('\n✅ Ready to login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createValidAdmin();
