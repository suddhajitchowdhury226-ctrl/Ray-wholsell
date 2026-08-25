/**
 * Fix Orphaned Carts - Remove cart items with non-existent products
 * This script will clean up all carts that reference deleted products
 * 
 * Usage: node fix-orphaned-carts.js [--dry-run]
 * 
 * --dry-run: Show what would be deleted without actually deleting
 */

const mongoose = require('mongoose');
require('dotenv').config();

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

function logSection(title) {
  console.log(`\n${COLORS.cyan}${'='.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(70)}${COLORS.reset}\n`);
}

function logSuccess(msg) { console.log(`${COLORS.green}✅${COLORS.reset} ${msg}`); }
function logError(msg) { console.log(`${COLORS.red}❌${COLORS.reset} ${msg}`); }
function logInfo(msg) { console.log(`${COLORS.blue}ℹ️${COLORS.reset}  ${msg}`); }
function logWarn(msg) { console.log(`${COLORS.yellow}⚠️${COLORS.reset}  ${msg}`); }

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log(`\n${COLORS.yellow}${COLORS.bright}DRY RUN MODE${COLORS.reset} - No changes will be made\n`);
  }
  
  try {
    logSection('ORPHANED CART CLEANUP');
    
    logInfo('Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    logSuccess('Connected!');
    
    // Find all carts with items
    logInfo('Finding all carts with items...');
    const allCarts = await Cart.find({ 'items.0': { $exists: true } });
    
    console.log(`Found ${allCarts.length} carts with items\n`);
    
    let totalItemsRemoved = 0;
    let totalCartsDeleted = 0;
    let totalCleaned = 0;
    
    const cartUpdates = [];
    
    // Check each cart item
    for (let i = 0; i < allCarts.length; i++) {
      const cart = allCarts[i];
      const originalItemCount = cart.items.length;
      let validItems = [];
      let removedItems = [];
      
      console.log(`\n${COLORS.bright}Cart ${i + 1}/${allCarts.length}${COLORS.reset}`);
      console.log(`   User: ${cart.user}`);
      console.log(`   Items: ${originalItemCount}`);
      
      // Check each item in the cart
      for (const item of cart.items) {
        const exists = await Product.exists({ _id: item.product });
        
        if (exists) {
          validItems.push(item);
          console.log(`   ✅ ${item.product}: VALID`);
        } else {
          removedItems.push(item.product);
          totalItemsRemoved++;
          console.log(`   ❌ ${item.product}: NOT FOUND - will be removed`);
        }
      }
      
      // Prepare update
      if (removedItems.length > 0) {
        totalCleaned++;
        
        if (validItems.length === 0) {
          // Cart will be empty - delete it
          cartUpdates.push({
            action: 'delete',
            cartId: cart._id,
            removedCount: removedItems.length,
          });
          totalCartsDeleted++;
          console.log(`   ${COLORS.yellow}→ This cart will be DELETED (no valid items left)${COLORS.reset}`);
        } else {
          // Keep valid items only
          cartUpdates.push({
            action: 'update',
            cartId: cart._id,
            newItems: validItems,
            removedCount: removedItems.length,
          });
          console.log(`   ${COLORS.yellow}→ This cart will be updated (${validItems.length} items kept)${COLORS.reset}`);
        }
      } else {
        console.log(`   ${COLORS.green}→ All items are valid, no changes needed${COLORS.reset}`);
      }
    }
    
    // Show summary before executing
    logSection('CLEANUP SUMMARY');
    
    console.log(`${COLORS.bright}Items to remove:${COLORS.reset} ${totalItemsRemoved}`);
    console.log(`${COLORS.bright}Carts to update:${COLORS.reset} ${cartUpdates.filter(u => u.action === 'update').length}`);
    console.log(`${COLORS.bright}Carts to delete:${COLORS.reset} ${cartUpdates.filter(u => u.action === 'delete').length}`);
    console.log(`${COLORS.bright}Carts to clean:${COLORS.reset} ${totalCleaned}`);
    
    // Execute updates if not in dry run mode
    if (dryRun) {
      logWarn('DRY RUN - No changes will be made');
      logInfo('Run without --dry-run flag to execute cleanup');
      process.exit(0);
    }
    
    // Ask for confirmation
    console.log(`\n${COLORS.yellow}⚠️${COLORS.reset}  ${COLORS.bright}IMPORTANT:${COLORS.reset}`);
    console.log(`This will permanently remove ${totalItemsRemoved} orphaned items from ${totalCleaned} carts`);
    console.log(`${totalCartsDeleted} carts with NO valid items will be deleted`);
    console.log(`\nThis action CANNOT be undone without database backups!\n`);
    
    // For automated execution, continue
    // In interactive mode, you might want to prompt here
    const confirmCleanup = true; // Set to false and add prompt if needed
    
    if (!confirmCleanup) {
      logError('Cleanup cancelled');
      process.exit(0);
    }
    
    logInfo('Executing cleanup...\n');
    
    let deletedCount = 0;
    let updatedCount = 0;
    
    // Apply updates
    for (const update of cartUpdates) {
      if (update.action === 'delete') {
        await Cart.deleteOne({ _id: update.cartId });
        deletedCount++;
        console.log(`${COLORS.red}🗑️${COLORS.reset}  Deleted cart ${update.cartId} (removed ${update.removedCount} items)`);
      } else if (update.action === 'update') {
        await Cart.updateOne(
          { _id: update.cartId },
          { items: update.newItems }
        );
        updatedCount++;
        console.log(`${COLORS.green}✏️${COLORS.reset}  Updated cart ${update.cartId} (removed ${update.removedCount} items)`);
      }
    }
    
    logSection('CLEANUP COMPLETED');
    
    logSuccess(`Removed ${totalItemsRemoved} orphaned items`);
    logSuccess(`Updated ${updatedCount} carts`);
    logSuccess(`Deleted ${deletedCount} empty carts`);
    
    console.log(`\n${COLORS.bright}Results:${COLORS.reset}`);
    console.log(`   Total items removed: ${totalItemsRemoved}`);
    console.log(`   Total carts updated: ${updatedCount}`);
    console.log(`   Total carts deleted: ${deletedCount}`);
    
    if (totalCleaned > 0) {
      logSuccess('✅ Your checkout endpoint should now work correctly!');
      logInfo('Users can now add items from current products and checkout successfully.');
    } else {
      logInfo('No cleanup was necessary - all carts are valid');
    }
    
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logInfo('Database connection closed');
    process.exit(0);
  }
}

// Show usage info
console.log(`${COLORS.bright}${COLORS.blue}╔════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.bright}${COLORS.blue}║   ORPHANED CART CLEANUP UTILITY                                      ║${COLORS.reset}`);
console.log(`${COLORS.bright}${COLORS.blue}╚════════════════════════════════════════════════════════════════════╝${COLORS.reset}`);

console.log(`\nThis script removes cart items that reference non-existent products.`);
console.log(`\nUsage:`);
console.log(`  ${COLORS.cyan}node fix-orphaned-carts.js --dry-run${COLORS.reset}    Show what would be deleted`);
console.log(`  ${COLORS.cyan}node fix-orphaned-carts.js${COLORS.reset}              Execute cleanup\n`);

main();
