const XLSX = require('xlsx');

const file = 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { range: 10 });

console.log('=== CHECKING PRICE COLUMNS ===\n');

// Check first 5 products
data.slice(0, 5).forEach((row, i) => {
  console.log(`\nProduct ${i + 1}: ${row['New RHL Product Name']}`);
  
  // Check all columns for price-like data
  Object.entries(row).forEach(([key, val]) => {
    if ((key.includes('PRICE') || key.includes('COST') || key.includes('WHOLESALE') || 
         key.includes('RETAIL') || key.includes('price') || key.includes('cost')) &&
        val !== undefined && val !== null && val !== '') {
      console.log(`  ${key}: ${val} (type: ${typeof val})`);
    }
  });
});

console.log('\n\n=== ALL COLUMN NAMES ===');
console.log(Object.keys(data[0]));
