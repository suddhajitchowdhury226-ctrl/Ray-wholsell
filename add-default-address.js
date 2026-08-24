const mongoose = require('mongoose');
const User = require('./Models/user');
require('dotenv').config();

console.log('🏠 Adding default address for debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  addDefaultAddress();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function addDefaultAddress() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Finding user: ${yourEmail}`);
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name}`);
    console.log(`📱 Phone: ${yourUser.phone}`);
    console.log(`📍 Current addresses: ${yourUser.addresses?.length || 0}`);
    
    if (yourUser.addresses && yourUser.addresses.length > 0) {
      console.log('\n📋 Existing addresses:');
      yourUser.addresses.forEach((addr, index) => {
        console.log(`${index + 1}. ${addr.title || 'No Title'}`);
        console.log(`   📍 ${addr.addressLine1}`);
        console.log(`   🏙️ ${addr.city}, ${addr.state} ${addr.zipcode}`);
        console.log(`   📧 ${addr.email}`);
        console.log(`   ✅ Default: ${addr.isDefault ? 'Yes' : 'No'}`);
        console.log(`   🆔 ID: ${addr._id}`);
      });
      
      // Check if there's already a default address
      const hasDefault = yourUser.addresses.some(addr => addr.isDefault);
      
      if (hasDefault) {
        console.log('\n✅ User already has a default address');
        console.log('💡 You can now checkout without issues');
        return;
      } else {
        console.log('\n🔧 Setting first address as default...');
        yourUser.addresses[0].isDefault = true;
        await yourUser.save();
        console.log('✅ First address set as default');
        return;
      }
    }
    
    // Add new default address
    console.log('\n🏠 Adding new default address...');
    
    const defaultAddress = {
      title: 'Home',
      name: yourUser.name || 'Tulanka Debnath',
      contactNumber: yourUser.phone || '9134465309',
      email: yourUser.email,
      addressLine1: '123 Main Street',
      addressLine2: 'Apartment 1A',
      city: 'Dhaka',
      state: 'Dhaka Division',
      country: 'Bangladesh',
      zipcode: '1000',
      isDefault: true
    };
    
    yourUser.addresses.push(defaultAddress);
    await yourUser.save();
    
    console.log('✅ Default address added successfully!');
    console.log('\n📍 Address Details:');
    console.log(`   🏠 Title: ${defaultAddress.title}`);
    console.log(`   👤 Name: ${defaultAddress.name}`);
    console.log(`   📱 Phone: ${defaultAddress.contactNumber}`);
    console.log(`   📧 Email: ${defaultAddress.email}`);
    console.log(`   🏠 Address: ${defaultAddress.addressLine1}`);
    console.log(`   🏠 Address 2: ${defaultAddress.addressLine2}`);
    console.log(`   🏙️ City: ${defaultAddress.city}`);
    console.log(`   🏛️ State: ${defaultAddress.state}`);
    console.log(`   🏳️ Country: ${defaultAddress.country}`);
    console.log(`   📮 Zipcode: ${defaultAddress.zipcode}`);
    console.log(`   ✅ Default: ${defaultAddress.isDefault}`);
    
    // Get the new address ID
    const updatedUser = await User.findOne({ email: yourEmail });
    const newAddressId = updatedUser.addresses[updatedUser.addresses.length - 1]._id;
    console.log(`   🆔 Address ID: ${newAddressId}`);
    
    console.log('\n🎉 READY FOR CHECKOUT!');
    console.log('📝 You can now:');
    console.log('   1. Login to http://localhost:5173/');
    console.log('   2. Add products to cart');
    console.log('   3. Proceed to checkout');
    console.log('   4. Select this default address');
    console.log('   5. Complete checkout and receive email');

  } catch (error) {
    console.error('❌ Error adding address:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}