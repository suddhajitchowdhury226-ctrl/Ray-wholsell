const axios = require('axios');
require('dotenv').config();

console.log('🧪 Testing OTP API endpoints...');

async function testOTPAPIs() {
  try {
    const baseURL = 'http://localhost:5555';
    const testEmail = 'debnathtulanka@gmail.com';
    
    console.log(`📡 Testing API server: ${baseURL}`);
    console.log(`📧 Using test email: ${testEmail}`);
    
    // Test 1: Forgot password OTP endpoint
    console.log('\n🔒 Testing forgot password OTP endpoint...');
    console.log('📤 POST /api/auth/forgot-password');
    
    try {
      const response1 = await axios.post(`${baseURL}/api/auth/forgot-password`, {
        email: testEmail
      });
      
      console.log('✅ Forgot password OTP API works!');
      console.log(`📤 Response status: ${response1.status}`);
      console.log(`📧 Response message: ${response1.data.message}`);
      
    } catch (error1) {
      console.log('❌ Forgot password OTP API failed');
      console.log(`📤 Status: ${error1.response?.status || 'No response'}`);
      console.log(`📧 Error: ${error1.response?.data?.message || error1.message}`);
      console.log(`🔍 Full error:`, error1.response?.data || error1.message);
    }
    
    // Test 2: Resend verification OTP endpoint
    console.log('\n📧 Testing resend verification OTP endpoint...');
    console.log('📤 POST /api/auth/resend-verification-otp');
    
    try {
      const response2 = await axios.post(`${baseURL}/api/auth/resend-verification-otp`, {
        email: testEmail
      });
      
      console.log('✅ Resend verification OTP API works!');
      console.log(`📤 Response status: ${response2.status}`);
      console.log(`📧 Response message: ${response2.data.message}`);
      
    } catch (error2) {
      console.log('❌ Resend verification OTP API failed');
      console.log(`📤 Status: ${error2.response?.status || 'No response'}`);
      console.log(`📧 Error: ${error2.response?.data?.message || error2.message}`);
    }
    
    // Test 3: Check if server is running
    console.log('\n🌐 Testing server health...');
    try {
      const healthResponse = await axios.get(`${baseURL}/api/auth/health`, {
        timeout: 5000
      }).catch(() => {
        return axios.get(`${baseURL}/health`, { timeout: 5000 });
      }).catch(() => {
        return axios.get(`${baseURL}/`, { timeout: 5000 });
      });
      
      console.log('✅ Server is responding');
      console.log(`📤 Status: ${healthResponse.status}`);
      
    } catch (healthError) {
      console.log('❌ Server health check failed');
      console.log(`📧 Error: ${healthError.message}`);
      
      if (healthError.code === 'ECONNREFUSED') {
        console.log('🚨 Backend server is not running on port 5555!');
        console.log('💡 Make sure the backend server is started');
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('1. Check if backend server is running on port 5555');
    console.log('2. Verify email configuration in backend');
    console.log('3. Check CORS settings for frontend requests');
    console.log('4. Ensure all OTP routes are properly configured');

  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
  }
}

testOTPAPIs();