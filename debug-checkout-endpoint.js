/**
 * Comprehensive Checkout Endpoint Debug Script
 * Tests all stages of order creation to identify exactly where errors occur
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('./Models/user');
const Product = require('./Models/productModel');
const Order = require('./Models/orderModel');
const Cart = require('./Models/cartModel');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, prefix, message) {
  console.log(`${COLORS[color]}${prefix}${COLORS.reset} ${message}`);
}

function logSection(title) {
  console.log(`\n${COLORS.cyan}${'='.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(70)}${COLORS.reset}\n`);
}

function logSuccess(msg) { log('green', '✅', msg); }
function logError(msg) { log('red', '❌', msg); }
function logInfo(msg) { log('blue', 'ℹ️ ', msg); }
function logWarn(msg) { log('yellow', '⚠️ ', msg); }

async function connectDB() {
  logSection('CONNECTING TO DATABASE');
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      logError('DATABASE_URL not found in .env');
      process.exit(1);
    }
    
    logInfo(`Connecting to MongoDB...`);
    await mongoose.connect(dbUrl);
    logSuccess('Connected to MongoDB successfully!');
    return true;
  } catch (error) {
    logError(`MongoDB Connection Error: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function findUser(userId) {
  logSection('STEP 1: USER LOOKUP');
  
  try {
    logInfo(`Searching for user with ID: ${userId}`);
    
    const user = await User.findById(userId).populate('addresses');
    
    if (!user) {
      logError(`User not found with ID: ${userId}`);
      return null;
    }
    
    logSuccess(`User found!`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Addresses: ${user.addresses.length}`);
    
    if (user.addresses.length === 0) {
      logWarn('User has NO addresses!');
      return null;
    }
    
    user.addresses.forEach((addr, idx) => {
      console.log(`\n   Address ${idx + 1}:`);
      console.log(`      Title: ${addr.title}`);
      console.log(`      Name: ${addr.name}`);
      console.log(`      Address: ${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}`);
      console.log(`      City: ${addr.city}`);
      console.log(`      State: ${addr.state}`);
      console.log(`      Zipcode: ${addr.zipcode}`);
      console.log(`      Country: ${addr.country}`);
      console.log(`      Contact: ${addr.contactNumber}`);
      console.log(`      ID: ${addr._id}`);
    });
    
    return user;
  } catch (error) {
    logError(`Error looking up user: ${error.message}`);
    console.error(error);
    return null;
  }
}

async function validateAddress(user, addressId) {
  logSection('STEP 2: ADDRESS VALIDATION');
  
  try {
    if (!user.addresses || user.addresses.length === 0) {
      logError('User has no addresses!');
      return null;
    }
    
    logInfo(`Validating address with ID: ${addressId}`);
    
    // Try to find address by ID
    const address = user.addresses.id(addressId);
    
    if (!address) {
      logError(`Address not found with ID: ${addressId}`);
      console.log(`Available address IDs:`);
      user.addresses.forEach((addr, idx) => {
        console.log(`   ${idx + 1}. ${addr._id.toString()}`);
      });
      return null;
    }
    
    logSuccess('Address found and validated!');
    console.log(`   Title: ${address.title}`);
    console.log(`   Name: ${address.name}`);
    console.log(`   Full Address: ${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}`);
    console.log(`   ${address.city}, ${address.state} ${address.zipcode}`);
    console.log(`   Country: ${address.country}`);
    console.log(`   Contact: ${address.contactNumber}`);
    console.log(`   Email: ${address.email || user.email}`);
    
    return address;
  } catch (error) {
    logError(`Error validating address: ${error.message}`);
    console.error(error);
    return null;
  }
}

async function findProduct(productId) {
  logSection(`STEP 3: PRODUCT LOOKUP`);
  
  try {
    logInfo(`Searching for product with ID: ${productId}`);
    
    const product = await Product.findById(productId);
    
    if (!product) {
      logError(`Product not found with ID: ${productId}`);
      return null;
    }
    
    logSuccess('Product found!');
    console.log(`   Name: ${product.name}`);
    console.log(`   Buy Price: $${product.buyPrice || 'NOT SET'}`);
    console.log(`   Sell Price: $${product.sellPrice || 'NOT SET'}`);
    console.log(`   Category: ${product.category || 'N/A'}`);
    console.log(`   Stock: ${product.stock || 'N/A'}`);
    
    // Validate prices
    if (!product.buyPrice && !product.sellPrice) {
      logError('Product has NO prices set!');
      return null;
    }
    
    return product;
  } catch (error) {
    logError(`Error looking up product: ${error.message}`);
    console.error(error);
    return null;
  }
}

async function validateCartItems(userId) {
  logSection('STEP 4: CART VALIDATION');
  
  try {
    logInfo(`Fetching cart for user: ${userId}`);
    
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      logWarn('No cart found for user');
      return [];
    }
    
    if (!cart.items || cart.items.length === 0) {
      logWarn('Cart is empty');
      return [];
    }
    
    logSuccess(`Found ${cart.items.length} items in cart:`);
    
    let validItems = [];
    let totalCartValue = 0;
    
    for (let i = 0; i < cart.items.length; i++) {
      const cartItem = cart.items[i];
      console.log(`\n   Item ${i + 1}:`);
      
      if (!cartItem.product) {
        logWarn(`   Product reference missing`);
        continue;
      }
      
      const product = cartItem.product;
      const price = cartItem.websiteRole === 'wholesaler' ? product.buyPrice : product.sellPrice;
      const itemTotal = price * cartItem.quantity;
      
      console.log(`      Product: ${product.name || 'UNNAMED'}`);
      console.log(`      Product ID: ${product._id}`);
      console.log(`      Quantity: ${cartItem.quantity}`);
      console.log(`      Website Role: ${cartItem.websiteRole}`);
      console.log(`      Price: $${price}`);
      console.log(`      Item Total: $${itemTotal}`);
      
      if (!price) {
        logError(`      MISSING PRICE for this item!`);
        continue;
      }
      
      validItems.push({
        productId: product._id,
        name: product.name,
        quantity: cartItem.quantity,
        price: price,
        websiteRole: cartItem.websiteRole,
        variantId: cartItem.variantId,
        flavour: cartItem.flavour,
      });
      
      totalCartValue += itemTotal;
    }
    
    logSuccess(`\nCart Total Value: $${totalCartValue.toFixed(2)}`);
    return validItems;
  } catch (error) {
    logError(`Error validating cart: ${error.message}`);
    console.error(error);
    return [];
  }
}

async function createTestOrder(user, address, cartItems) {
  logSection('STEP 5: ORDER CREATION');
  
  try {
    if (!user) {
      logError('No user provided');
      return false;
    }
    
    if (!address) {
      logError('No address provided');
      return false;
    }
    
    if (!cartItems || cartItems.length === 0) {
      logError('No cart items provided');
      return false;
    }
    
    logInfo('Creating test order object...');
    
    // Calculate totals
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.price * item.quantity;
    }
    
    const shippingCost = subtotal >= 100 ? 0 : 15.00;
    const discount = 0;
    const total = subtotal + shippingCost - discount;
    
    // Generate order number
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD-${timestamp}${random}`;
    
    logInfo(`Order Number: ${orderNumber}`);
    console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`   Shipping: $${shippingCost.toFixed(2)}`);
    console.log(`   Discount: $${discount.toFixed(2)}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    console.log(`   Items: ${cartItems.length}`);
    
    // Create the order
    logInfo('Creating Order document...');
    
    const orderData = {
      user: user._id,
      orderNumber: orderNumber,
      items: cartItems,
      deliveryAddress: {
        title: address.title,
        name: address.name,
        contactNumber: address.contactNumber,
        email: address.email || user.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        country: address.country,
        zipcode: address.zipcode,
      },
      subtotal,
      shippingCost,
      discount,
      total,
      status: 'pending_review',
      couponCode: null,
      notes: 'Debug test order',
      userEmail: user.email,
      websiteRole: 'wholesaler',
    };
    
    console.log('\n   Order Data Structure:');
    console.log(`      user: ${orderData.user}`);
    console.log(`      userEmail: ${orderData.userEmail}`);
    console.log(`      deliveryAddress.email: ${orderData.deliveryAddress.email}`);
    console.log(`      items count: ${orderData.items.length}`);
    console.log(`      total: ${orderData.total}`);
    
    const order = new Order(orderData);
    
    logInfo('Validating order schema...');
    const validationError = order.validateSync();
    
    if (validationError) {
      logError('Order validation failed!');
      console.error(validationError);
      return false;
    }
    
    logSuccess('Order schema validation passed!');
    
    logInfo('Attempting to save order to database...');
    
    await order.save();
    
    logSuccess('Order created successfully!');
    console.log(`   Order ID: ${order._id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Created At: ${order.createdAt}`);
    
    return true;
  } catch (error) {
    logError(`Error creating order: ${error.message}`);
    console.error('Full Error Object:');
    console.error(error);
    
    if (error.errors) {
      logError('Validation Errors:');
      Object.keys(error.errors).forEach(field => {
        console.log(`   ${field}: ${error.errors[field].message}`);
      });
    }
    
    return false;
  }
}

async function createSampleOrder(user, address) {
  logSection('STEP 5B: SAMPLE ORDER CREATION (WITHOUT REAL PRODUCTS)');
  
  try {
    if (!user) {
      logError('No user provided');
      return false;
    }
    
    if (!address) {
      logError('No address provided');
      return false;
    }
    
    logInfo('Creating sample order with mock items...');
    
    // Use ObjectId for sample product
    const sampleProductId = new mongoose.Types.ObjectId();
    
    const sampleItems = [
      {
        product: sampleProductId,
        name: 'Sample Product 1',
        quantity: 2,
        price: 29.99,
        websiteRole: 'wholesaler',
        variantId: undefined,
        flavour: undefined,
      },
      {
        product: new mongoose.Types.ObjectId(),
        name: 'Sample Product 2',
        quantity: 1,
        price: 49.99,
        websiteRole: 'wholesaler',
      },
    ];
    
    // Calculate totals
    let subtotal = 0;
    for (const item of sampleItems) {
      subtotal += item.price * item.quantity;
    }
    
    const shippingCost = subtotal >= 100 ? 0 : 15.00;
    const total = subtotal + shippingCost;
    
    // Generate order number
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `SAMPLE-${timestamp}${random}`;
    
    logInfo(`Sample Order Number: ${orderNumber}`);
    console.log(`   Items: ${sampleItems.length}`);
    console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`   Shipping: $${shippingCost.toFixed(2)}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    
    const order = new Order({
      user: user._id,
      orderNumber: orderNumber,
      items: sampleItems,
      deliveryAddress: {
        title: address.title,
        name: address.name,
        contactNumber: address.contactNumber,
        email: address.email || user.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        country: address.country,
        zipcode: address.zipcode,
      },
      subtotal,
      shippingCost,
      discount: 0,
      total,
      status: 'pending_review',
      couponCode: null,
      notes: 'Sample debug order',
      userEmail: user.email,
      websiteRole: 'wholesaler',
    });
    
    logInfo('Validating sample order schema...');
    const validationError = order.validateSync();
    
    if (validationError) {
      logError('Sample order validation failed!');
      console.error(validationError);
      return false;
    }
    
    logSuccess('Sample order schema validation passed!');
    
    logInfo('Attempting to save sample order...');
    await order.save();
    
    logSuccess('Sample order created successfully!');
    console.log(`   Order ID: ${order._id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    
    return true;
  } catch (error) {
    logError(`Error creating sample order: ${error.message}`);
    console.error('Full Error Object:');
    console.error(error);
    
    if (error.errors) {
      logError('Validation Errors:');
      Object.keys(error.errors).forEach(field => {
        console.log(`   ${field}: ${error.errors[field].message}`);
      });
    }
    
    return false;
  }
}

async function main() {
  console.clear();
  console.log(`${COLORS.bright}${COLORS.blue}╔════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}║   CHECKOUT ENDPOINT - COMPREHENSIVE DEBUG SCRIPT                    ║${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}╚════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);
  
  // Connect to database
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  // User ID to test
  const testUserId = process.argv[2] || '6a833aa8d5ea60de186d8b14';
  
  logInfo(`Testing with User ID: ${testUserId}\n`);
  
  try {
    // Step 1: Find user
    const user = await findUser(testUserId);
    if (!user) {
      logError('Cannot proceed without valid user');
      process.exit(1);
    }
    
    // Step 2: Validate address
    const firstAddressId = user.addresses[0]._id;
    const address = await validateAddress(user, firstAddressId);
    if (!address) {
      logError('Cannot proceed without valid address');
      process.exit(1);
    }
    
    // Step 3: Find a product (if any exist)
    logInfo('Searching for existing products...');
    const anyProduct = await Product.findOne().limit(1);
    
    if (anyProduct) {
      logSuccess(`Found product: ${anyProduct.name} (${anyProduct._id})`);
      const product = await findProduct(anyProduct._id);
      
      if (product) {
        // Step 4: Get cart items
        const cartItems = await validateCartItems(user._id);
        
        if (cartItems && cartItems.length > 0) {
          // Step 5: Create order with real cart items
          await createTestOrder(user, address, cartItems);
        } else {
          logWarn('No valid cart items, trying with sample items instead...\n');
          await createSampleOrder(user, address);
        }
      }
    } else {
      logWarn('No products found in database');
      logInfo('Creating sample order instead...\n');
      await createSampleOrder(user, address);
    }
    
    logSection('DEBUG COMPLETE');
    logSuccess('Script execution completed successfully!');
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    logInfo('Database connection closed');
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
