const axios = require('axios');

async function checkServer() {
  const baseURL = 'http://localhost:5555';
  
  try {
    console.log('🔗 Testing server endpoints...');
    
    // Try different endpoints to see if server is responding
    const endpoints = [
      '/api/auth/test',
      '/api/products',
      '/api/users',
      '/',
      '/api'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing: ${baseURL}${endpoint}`);
        const response = await axios.get(`${baseURL}${endpoint}`, { timeout: 3000 });
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
        break; // If one works, server is running
      } catch (err) {
        console.log(`❌ ${endpoint} - Error: ${err.code || err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Server check failed:', error.message);
  }
}

checkServer();