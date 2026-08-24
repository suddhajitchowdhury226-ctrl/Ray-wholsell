const mongoose = require('mongoose');
const User = require('./Models/user');
require('dotenv').config();

console.log('🗽 Adding New York City default address for debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  addNYCAddress();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function addNYCAddress() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Finding user: ${yourEmail}`);
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name}`);
    console.log(`📍 Current addresses: ${yourUser.addresses?.length || 0}`);
    
    // Show existing addresses
    if (yourUser.addresses && yourUser.addresses.length > 0) {
      console.log('\n📋 Existing addresses:');
      yourUser.addresses.forEach((addr, index) => {
        console.log(`${index + 1}. ${addr.title || 'No Title'}`);
        console.log(`   📍 ${addr.addressLine1}, ${addr.city}, ${addr.state}`);
        console.log(`   ✅ Default: ${addr.isDefault ? 'Yes' : 'No'}`);
      });
    }
    
    // Clear existing default flags
    if (yourUser.addresses) {
      yourUser.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    } else {
      yourUser.addresses = [];
    }
    
    // Add New York City address
    console.log('\n🗽 Adding New York City address...');
    
    const nycAddress = {
      title: 'New York Office',
      name: yourUser.name || 'Tulanka Debnath',
      contactNumber: yourUser.phone || '9134465309',
      email: yourUser.email,
      addressLine1: '123 Broadway Avenue',
      addressLine2: 'Suite 1001',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      zipcode: '10001',
      isDefault: true
    };
    
    yourUser.addresses.push(nycAddress);
    await yourUser.save();
    
    console.log('✅ New York City address added successfully!');
    console.log('\n🗽 NEW YORK ADDRESS DETAILS:');
    console.log(`   🏠 Title: ${nycAddress.title}`);
    console.log(`   👤 Name: ${nycAddress.name}`);
    console.log(`   📱 Phone: ${nycAddress.contactNumber}`);
    console.log(`   📧 Email: ${nycAddress.email}`);
    console.log(`   🏢 Address: ${nycAddress.addressLine1}`);
    console.log(`   🏢 Suite: ${nycAddress.addressLine2}`);
    console.log(`   🏙️ City: ${nycAddress.city}`);
    console.log(`   🏛️ State: ${nycAddress.state}`);
    console.log(`   🏳️ Country: ${nycAddress.country}`);
    console.log(`   📮 ZIP Code: ${nycAddress.zipcode}`);
    console.log(`   ✅ Default: ${nycAddress.isDefault}`);
    
    // Get the updated user to show address ID
    const updatedUser = await User.findOne({ email: yourEmail });
    const newAddressId = updatedUser.addresses[updatedUser.addresses.length - 1]._id;
    console.log(`   🆔 Address ID: ${newAddressId}`);
    
    console.log('\n📋 ALL ADDRESSES NOW:');
    updatedUser.addresses.forEach((addr, index) => {
      console.log(`${index + 1}. ${addr.title || 'No Title'}`);
      console.log(`   📍 ${addr.addressLine1}, ${addr.city}, ${addr.state}`);
      console.log(`   ✅ Default: ${addr.isDefault ? 'YES (Will be used for checkout)' : 'No'}`);
      console.log(`   🆔 ID: ${addr._id}`);
    });
    
    console.log('\n🎉 READY FOR NEW YORK CHECKOUT!');
    console.log('📝 You can now:');
    console.log('   1. 🌐 Login to http://localhost:5173/');
    console.log('   2. 🛒 Add products to cart');
    console.log('   3. 🛍️ Proceed to checkout');
    console.log('   4. 📍 NYC address will be selected by default');
    console.log('   5. 💳 Complete checkout');
    console.log('   6. 📧 Receive email confirmation at debnathtulanka@gmail.com');
    console.log('\n🗽 Your orders will now ship to New York City! 🚀');

  } catch (error) {
    console.error('❌ Error adding NYC address:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}