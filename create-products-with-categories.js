const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('🔄 Extracting products with proper categories...');

// Read Excel file
const file = 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { range: 10 }); // Start from row 11

// Category mapping: Product TYPE -> Main Category (max 50 chars)
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

const products = data.map((row, index) => {
  const productType = row['PRODUCT TYPE'] || 'Health Supplements';
  const mainCategory = categoryMapping[productType] || 'Health Supplements';
  
  return {
    upc: (row['UPC'] || row['RHL GSI Barcode'] || '').toString().trim(),
    lookup_code: (row['RHL GSI Barcode'] || '').toString().trim(),
    item_number: (row['RHL Product ID #'] || row['ITEM #'] || '').toString().trim(),
    name: (row['New RHL Product Name'] || row['PRODUCT NAME'] || '').trim(),
    brand: productType, // Keep original type as brand for now
    category: mainCategory, // Map to main category
    department: productType, // Keep product type as department
    description: (row['RHL Short Product Description'] || '').trim(),
    ingredient: (row['Ingredents'] || row['Ingredients'] || '').trim(),
    buyPrice: parseFloat(row['RHL COST 25% LESS'] || 0) || 0,
    sellPrice: parseFloat(row['Manufacture WHOLESALE'] || 0) || 0,
    quantity: parseInt(row['QTY'] || 0) || 0,
    size: (row['SIZE'] || '').trim()
  };
}).filter(p => p.name); // Remove empty rows

console.log(`✅ Extracted ${products.length} products with categories`);

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
