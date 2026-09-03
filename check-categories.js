const XLSX = require('xlsx');

const file = 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('=== SHEET STRUCTURE ===');
console.log('Total columns:', Object.keys(data[0]).length);
console.log('Column names:', Object.keys(data[0]));

console.log('\n=== CHECKING CATEGORY/TYPE COLUMNS ===');
const firstRow = data[0];
Object.entries(firstRow).forEach(([key, val]) => {
  if (key.toLowerCase().includes('type') || 
      key.toLowerCase().includes('category') || 
      key.toLowerCase().includes('department') ||
      key.toLowerCase().includes('ingredient') ||
      key.toLowerCase().includes('formula')) {
    console.log(`\n"${key}": "${val}"`);
  }
});

console.log('\n=== FIRST 5 PRODUCT TYPES ===');
const types = new Set();
data.forEach((row, i) => {
  if (i < 5) {
    const productType = row['Product TYPE'] || row['Type'] || 'unknown';
    console.log(`Row ${i + 1}: ${productType}`);
  }
});

console.log('\n=== UNIQUE PRODUCT TYPES ===');
const uniqueTypes = new Set(data.map(row => row['Product TYPE'] || row['Type']));
Array.from(uniqueTypes).forEach(type => console.log(`  - ${type}`));

console.log('\n=== INGREDIENTS SAMPLE ===');
data.slice(0, 3).forEach((row, i) => {
  const ingredients = row['Ingredients'] || row['ingredient'] || 'N/A';
  console.log(`Product ${i + 1}: ${ingredients.substring(0, 100)}...`);
});
