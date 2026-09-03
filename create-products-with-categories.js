const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('🔄 Extracting products with proper categories...');

// Read Excel file
const file = 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Read raw sheet to get proper cell values (skip header rows, start at row 12 = index 11)
const rows = [];
for (let i = 12; i <= sheet['!ref'].split(':')[1].replace(/[A-Z]/g, ''); i++) {
  const row = {};
  // Column mapping based on Excel structure
  row.productType = sheet[`B${i}`]?.v;      // Column B: PRODUCT TYPE
  row.itemNumber = sheet[`C${i}`]?.v;        // Column C: ITEM #
  row.rhlProductId = sheet[`D${i}`]?.v;      // Column D: RHL Product ID #
  row.rhlBarcode = sheet[`E${i}`]?.v;        // Column E: RHL GSI Barcode
  row.upc = sheet[`F${i}`]?.v;               // Column F: UPC
  row.productName = sheet[`G${i}`]?.v;       // Column G: PRODUCT NAME
  row.newRhlName = sheet[`H${i}`]?.v;        // Column H: New RHL Product Name
  row.description = sheet[`I${i}`]?.v;       // Column I: RHL Short Product Description
  row.ingredients = sheet[`J${i}`]?.v;       // Column J: Ingredents
  row.size = sheet[`K${i}`]?.v;              // Column K: SIZE
  row.wholesalePrice = sheet[`L${i}`]?.v;    // Column L: Manfacture WHOLESALE
  row.costPrice = sheet[`M${i}`]?.v;         // Column M: RHL COST 25% LESS
  row.qty = sheet[`N${i}`]?.v;               // Column N: QTY
  
  if (row.newRhlName) {
    rows.push(row);
  }
}

console.log(`Found ${rows.length} products in Excel`);

// Category mapping
const categoryMapping = {
  'Liquid- Single': 'Single Herbal Liquid Extracts',
  'Liquid- Single Alcohol Free': 'Single Herbal Liquid Extracts',
  'Single (A/F)': 'Single Herbal Liquid Extracts',
  'Liquid- Formula': 'Herbal Formula Liquid Extracts',
  'Liquid- Formula Alcohol-Free': 'Herbal Formula Liquid Extracts',
  'Liquid- Formula Kid\'s': 'Kids Formulas',
  'Capsules- Fresh Ground': 'Herbal Powders',
  'Capsules- Liquid': 'Herbal Powders',
  'CBD Capsules- Liquid': 'CBD',
  'CBD Liquid- Full': 'CBD',
  'CBD Liquid- Broad': 'CBD',
  'CBD Topical': 'CBD',
  'Liquid- Vitamins and Minerals': 'Vitamins & Minerals',
  'Carrier Oils': 'Carrier Oils',
  'Essential Oils': 'Essential Oils',
  'Essential Oils- Organic': 'Essential Oils',
  'Herbal Oils': 'Herbal Oils',
  'Herbal Powder': 'Herbal Powders',
  'Empty Bottle': 'Empty Bottles',
  'Literature': 'Literature'
};

const products = rows.map((row, index) => {
  const productType = row.productType || 'Health Supplements';
  const mainCategory = categoryMapping[productType] || 'Health Supplements';
  
  return {
    upc: (row.upc || row.rhlBarcode || '').toString().trim(),
    lookup_code: (row.rhlBarcode || '').toString().trim(),
    item_number: (row.rhlProductId || row.itemNumber || '').toString().trim(),
    name: (row.newRhlName || row.productName || '').trim(),
    brand: productType,
    category: mainCategory,
    department: productType,
    description: (row.description || '').toString().trim(),
    ingredient: (row.ingredients || '').toString().trim(),
    buyPrice: parseFloat(row.costPrice) || 0,
    sellPrice: parseFloat(row.wholesalePrice) || 0,
    quantity: parseInt(row.qty) || 100, // Default to 100 if not specified
    size: (row.size || '').toString().trim()
  };
}).filter(p => p.name && p.sellPrice > 0); // Only keep products with name and price

console.log(`✅ Extracted ${products.length} products with prices`);

// Show pricing range
const prices = products.map(p => p.sellPrice).sort((a, b) => a - b);
console.log(`\n💰 Price Range:`);
console.log(`  Min: $${prices[0].toFixed(2)}`);
console.log(`  Max: $${prices[prices.length - 1].toFixed(2)}`);
console.log(`  Avg: $${(prices.reduce((a, b) => a + b) / prices.length).toFixed(2)}`);

// Show category distribution
const categoryCount = {};
products.forEach(p => {
  categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
});

console.log('\n📊 Product Distribution by Main Category:');
Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} products`);
});

// Save to JSON
const outputFile = 'products-with-categories.json';
fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
console.log(`\n✅ Saved to ${outputFile}`);
