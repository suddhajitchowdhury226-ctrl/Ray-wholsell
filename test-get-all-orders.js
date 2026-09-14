const axios = require('axios');
require('dotenv').config();

const baseURL = 'https://ray-wholsell.onrender.com';

async function testGetAllOrders() {
  try {
    console.log('🔍 Testing GET /api/orders/all-orders endpoint...\n');

    // Test 1: Without authentication (should fail with 401)
    console.log('Test 1: Without authentication token');
    try {
      const response = await axios.get(`${baseURL}/api/orders/all-orders`);
      console.log('✅ Request succeeded (unexpected)');
      console.log('Response:', response.data);
    } catch (error) {
      console.log(`❌ Status: ${error.response?.status}`);
      console.log(`Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 2: With invalid token (should fail with 401)
    console.log('\nTest 2: With invalid token');
    try {
      const response = await axios.get(`${baseURL}/api/orders/all-orders`, {
        headers: {
          'Authorization': 'Bearer invalid_token_12345'
        }
      });
      console.log('✅ Request succeeded (unexpected)');
    } catch (error) {
      console.log(`❌ Status: ${error.response?.status}`);
      console.log(`Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Check if route exists by testing without auth
    console.log('\nTest 3: Route structure check');
    try {
      const response = await axios.get(`${baseURL}/api/orders`, {
        validateStatus: () => true // Accept any status
      });
      console.log(`Status: ${response.status}`);
      console.log('Response:', response.data);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }

    console.log('\n✅ Tests completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

testGetAllOrders();
