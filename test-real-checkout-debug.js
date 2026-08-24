const axios = require('axios');
require('dotenv').config();

// Test the actual REST API endpoint
async function testRealCheckout() {
  try {
    console.log('🧪 Testing actual REST API checkout endpoint...');
    console.log('📡 Base URL:', 'http://localhost:5555');

    const baseURL = 'http://localhost:5555';
    
    // Test login first to get token
    console.log('🔐 Attempting login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@raywholesale.com',
      password: 'admin123', // You might need to adjust this
      role: 'admin'
    });

    if (!loginResponse.data.token) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');

    // Test getting user addresses
    console.log('📍 Getting user addresses...');
    const addressResponse = await axios.get(`${baseURL}/api/auth/get-addresses`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📍 Address response:', addressResponse.data);
    
    if (!addressResponse.data.addresses || addressResponse.data.addresses.length === 0) {
      console.log('📍 No addresses found, creating one...');
      
      // Create an address first
      const createAddressResponse = await axios.post(`${baseURL}/api/auth/add-address`, {
        title: 'Test Address',
        name: 'Test Customer',
        contactNumber: '1234567890',
        email: 'admin@raywholesale.com',
        addressLine1: '123 Test Street',
        addressLine2: '',
        city: 'Test City',
        state: 'Test State',
        country: 'United States',
        zipcode: '12345'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📍 Address creation response:', createAddressResponse.data);
      
      if (createAddressResponse.data.success) {
        console.log('✅ Address created successfully');
      }
      
      // Get addresses again
      const newAddressResponse = await axios.get(`${baseURL}/api/auth/get-addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (newAddressResponse.data.addresses && newAddressResponse.data.addresses.length > 0) {
        console.log('📍 Using newly created address');
      }
    }

    // Get cart to see what's there
    console.log('🛒 Getting current cart...');
    try {
      const cartResponse = await axios.get(`${baseURL}/api/user/get-cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🛒 Current cart:', cartResponse.data);
    } catch (cartError) {
      console.log('⚠️ Error getting cart (might be empty):', cartError.response?.data || cartError.message);
    }

    // Try to add a product to cart first
    console.log('🛒 Adding product to cart...');
    try {
      const addToCartResponse = await axios.post(`${baseURL}/api/user/add-to-cart`, {
        productId: '64a7b8c9d1e2f3a4b5c6d789', // This might need to be a real product ID
        quantity: 12,
        websiteRole: 'wholesaler'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🛒 Add to cart response:', addToCartResponse.data);
    } catch (cartError) {
      console.log('⚠️ Error adding to cart:', cartError.response?.data || cartError.message);
    }

    // Now try checkout
    console.log('🚀 Attempting checkout...');
    const checkoutResponse = await axios.post(`${baseURL}/api/orders/checkout`, {
      addressId: null, // Will use the first address from the get-addresses response
      couponCode: null,
      notes: 'Test checkout from debug script'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Checkout successful!');
    console.log('📧 Response:', checkoutResponse.data);

  } catch (error) {
    console.error('❌ Error in checkout test:', error.response?.data || error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response headers:', error.response.headers);
    }
  }
}

// Run the test
testRealCheckout();