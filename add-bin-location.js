/**
 * Add bin_location to seed data
 * Generates sequential bin locations based on RHL ID
 */

const fs = require('fs');
const path = require('path');

const seedFile = path.join(__dirname, 'rhl-product-catalog-seed.json');

console.log('📖 Reading seed data...');
const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

let updated = 0;

// Add bin_location to each product
const updatedData = seedData.map(product => {
  if (!product.bin_location) {
    // Generate bin location based on RHL ID (e.g., "A-200", "B-201", etc.)
    const row = String.fromCharCode(65 + (product.rhlId % 26)); // A-Z
    const column = Math.floor(product.rhlId / 26) + 1;
    const shelf = (product.rhlId % 3) + 1;
    
    product.bin_location = `${row}-${column}-${shelf}`;
    updated++;
  }
  return product;
});

// Write back
fs.writeFileSync(seedFile, JSON.stringify(updatedData, null, 2));

console.log(`✅ Added bin_location to ${updated} products`);
console.log(`📦 Updated seed file: ${seedFile}`);
