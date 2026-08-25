#!/usr/bin/env node
/**
 * Diagnose live checkout issues on Render backend
 * This script attempts to replicate the exact checkout flow to identify 500 error cause
 */

const axios = require('axios');

const API_URL = 'https://ray-wholsell.onrender.com';

async function diagnoseCheckout() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  LIVE CHECKOUT DIAGNOSIS - Render Backend          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Step 1: Try logging in with a test user
    console.log('Step 1: Testing user authentication...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'suddhajitchowdhury226@gmail.com',
      password: 'Test@1234' // Using known credentials
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 2: Get user profile
    console.log('\nStep 2: Getting user profile...');
    const userResponse = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const userId = userResponse.data._id;
    console.log(`✅ User found: ${userResponse.data.email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Addresses: ${userResponse.data.addresses?.length || 0}`);

    if (!userResponse.data.addresses || userResponse.data.addresses.length === 0) {
      console.log('   ⚠️  WARNING: User has no addresses!');
      return;
    }

    const addressId = userResponse.data.addresses[0]._id;

    // Step 3: Get user's cart
    console.log('\nStep 3: Getting user cart...');
    const cartResponse = await axios.get(`${API_URL}/api/user/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const cart = cartResponse.data;
    console.log(`✅ Cart retrieved`);
    console.log(`   Items: ${cart.items?.length || 0}`);

    // Step 4: Construct checkout payload
    console.log('\nStep 4: Constructing checkout payload...');
    
    // If cart is empty, use test items
    let items;
    if (!cart.items || cart.items.length === 0) {
      console.log('   ⚠️  Cart is empty - using mock items for testing');
      items = [
        {
          productId: '6a8dc24580a760a029e74fc3', // Known valid product
          quantity: 15,
          price: 5.18,
          websiteRole: 'user'
        }
      ];
    } else {
      items = cart.items.map(item => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        price: item.product?.buyPrice || item.price || 10.00,
        websiteRole: item.websiteRole || 'user'
      }));
    }

    const checkoutPayload = {
      addressId,
      couponCode: null,
      notes: 'Test order from diagnostic script',
      items
    };

    console.log('   Payload constructed:');
    console.log(`   - Address ID: ${checkoutPayload.addressId}`);
    console.log(`   - Items: ${checkoutPayload.items.length}`);
    console.log(`   - Sample item: ${JSON.stringify(checkoutPayload.items[0])}`);

    // Step 5: Send checkout request
    console.log('\nStep 5: Sending checkout request...');
    console.log(`   POST ${API_URL}/api/orders/checkout`);

    try {
      const checkoutResponse = await axios.post(
        `${API_URL}/api/orders/checkout`,
        checkoutPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Checkout successful!');
      console.log(`   Order Number: ${checkoutResponse.data.order?.orderNumber}`);
      console.log(`   Order Total: $${checkoutResponse.data.order?.total}`);
      console.log(`   Status: ${checkoutResponse.data.order?.status}`);

    } catch (checkoutError) {
      console.log('❌ Checkout failed!');
      console.log(`   Status: ${checkoutError.response?.status}`);
      console.log(`   Status Text: ${checkoutError.response?.statusText}`);
      
      if (checkoutError.response?.data) {
        console.log(`   Response:`, JSON.stringify(checkoutError.response.data, null, 2));
      }

      // Try to provide diagnostic info
      console.log('\n🔍 DIAGNOSTIC INFORMATION:');
      console.log('   Possible causes of 500 error:');
      console.log('   1. Invalid product IDs in items array');
      console.log('   2. User address not found or invalid');
      console.log('   3. Cart items with missing product references');
      console.log('   4. Database connection issue');
      console.log('   5. Email service failure');
      
      console.log('\n📋 Request Details:');
      console.log(`   Payload: ${JSON.stringify(checkoutPayload, null, 2)}`);
      
      throw checkoutError;
    }

  } catch (error) {
    console.log('\n❌ Diagnostic failed:', error.message);
    if (error.response?.data) {
      console.log('Error response:', error.response.data);
    }
  }

  console.log('\n✅ Diagnostic complete!');
  console.log('');
}

// Run diagnostic
diagnoseCheckout().catch(err => {
  console.error(err);
  process.exit(1);
});
