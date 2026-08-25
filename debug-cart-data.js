/**
 * Detailed cart data investigation
 * Shows exactly what's stored in carts and why population might fail
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');

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

async function main() {
  try {
    console.log(`${COLORS.bright}${COLORS.blue}Connecting to MongoDB...${COLORS.reset}`);
    await mongoose.connect(process.env.DATABASE_URL);
    logSuccess('Connected to MongoDB!');
    
    logSection('STEP 1: FIND ALL CARTS WITH ITEMS');
    
    // Get raw cart data WITHOUT population
    const cartsRaw = await Cart.find({ 'items.0': { $exists: true } }).lean();
    
    console.log(`Found ${cartsRaw.length} carts with items:\n`);
    
    for (let i = 0; i < cartsRaw.length; i++) {
      const cart = cartsRaw[i];
      console.log(`${COLORS.bright}Cart #${i + 1}:${COLORS.reset}`);
      console.log(`   User: ${cart.user}`);
      console.log(`   Items in cart: ${cart.items.length}`);
      
      for (let j = 0; j < cart.items.length; j++) {
        const item = cart.items[j];
        console.log(`\n   Item ${j + 1}:`);
        console.log(`      Product ID (raw): ${item.product}`);
        console.log(`      Product ID type: ${typeof item.product}`);
        console.log(`      Product ID valid ObjectId: ${mongoose.Types.ObjectId.isValid(item.product)}`);
        console.log(`      Quantity: ${item.quantity}`);
        console.log(`      Website Role: ${item.websiteRole}`);
        console.log(`      Variant ID: ${item.variantId}`);
        console.log(`      Flavour: ${item.flavour}`);
      }
      
      console.log();
    }
    
    logSection('STEP 2: TEST PRODUCT LOOKUP');
    
    // Test if we can find products with these IDs
    if (cartsRaw.length > 0 && cartsRaw[0].items.length > 0) {
      const firstProductId = cartsRaw[0].items[0].product;
      
      logInfo(`Testing product lookup with ID: ${firstProductId}`);
      
      // Try to find the product
      const product = await Product.findById(firstProductId);
      
      if (product) {
        logSuccess(`Product found!`);
        console.log(`   Name: ${product.name}`);
        console.log(`   Buy Price: ${product.buyPrice}`);
        console.log(`   Sell Price: ${product.sellPrice}`);
      } else {
        logError(`Product NOT found with this ID`);
        
        // Check if ANY products exist
        const totalProducts = await Product.countDocuments();
        console.log(`   Total products in DB: ${totalProducts}`);
        
        // Try to find ANY product
        const anyProduct = await Product.findOne();
        if (anyProduct) {
          console.log(`\n   Sample product found:`);
          console.log(`      Name: ${anyProduct.name}`);
          console.log(`      ID: ${anyProduct._id}`);
        }
      }
    }
    
    logSection('STEP 3: TEST CART POPULATION');
    
    // Now test with population
    if (cartsRaw.length > 0) {
      const cartId = cartsRaw[0]._id;
      
      logInfo(`Testing population on cart: ${cartId}`);
      
      const cartWithPopulation = await Cart.findById(cartId).populate('items.product');
      
      if (cartWithPopulation) {
        console.log(`   Items after population: ${cartWithPopulation.items.length}`);
        
        for (let i = 0; i < cartWithPopulation.items.length; i++) {
          const item = cartWithPopulation.items[i];
          console.log(`\n   Item ${i + 1}:`);
          console.log(`      Product: ${item.product}`);
          console.log(`      Product is null/undefined: ${!item.product}`);
          
          if (item.product) {
            console.log(`      Product name: ${item.product.name}`);
          }
        }
      }
    }
    
    logSection('STEP 4: ANALYZE POTENTIAL ISSUES');
    
    // Check if there are orphaned cart items (product IDs that don't exist)
    if (cartsRaw.length > 0) {
      console.log('Checking for orphaned product references...\n');
      
      let orphanedCount = 0;
      let validCount = 0;
      
      for (const cart of cartsRaw) {
        for (const item of cart.items) {
          const exists = await Product.exists({ _id: item.product });
          if (exists) {
            validCount++;
          } else {
            orphanedCount++;
            console.log(`   ❌ Orphaned: Product ID ${item.product} (Cart: ${cart.user})`);
          }
        }
      }
      
      console.log(`\n   Valid product references: ${validCount}`);
      console.log(`   Orphaned product references: ${orphanedCount}`);
      
      if (orphanedCount > 0) {
        logError(`Found ${orphanedCount} cart items with non-existent products!`);
        logInfo('This is likely the cause of your checkout errors.');
      }
    }
    
    logSection('STEP 5: CHECK PRODUCT COLLECTION');
    
    // Get some sample products
    const sampleProducts = await Product.find().limit(5).select('_id name buyPrice sellPrice');
    
    console.log(`Sample products in database (${sampleProducts.length} shown):\n`);
    
    sampleProducts.forEach((product, idx) => {
      console.log(`${idx + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Buy Price: ${product.buyPrice}`);
      console.log(`   Sell Price: ${product.sellPrice}`);
      console.log();
    });
    
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    logInfo('Database connection closed');
    process.exit(0);
  }
}

main();
