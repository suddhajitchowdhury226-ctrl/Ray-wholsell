const xlsx = require('xlsx');
const path = require('path');

async function findProductsStart() {
  console.log('🔍 Finding where product data starts...');
  console.log('==================================================\n');

  try {
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    const workbook = xlsx.readFile(excelFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Search for rows that contain liquid extract info
    for (let row = 1; row <= 100; row++) {
      const colA = sheet[`A${row}`]?.v || '';
      const colB = sheet[`B${row}`]?.v || '';
      const colC = sheet[`C${row}`]?.v || '';
      const colD = sheet[`D${row}`]?.v || '';
      
      const rowStr = `${colA} | ${colB} | ${colC} | ${colD}`;
      
      // Look for actual products (those with names like "Adaptogen", "Extract", etc)
      if (colA && colA.toString().length > 5 && !colA.toString().includes('Date') && !colA.toString().includes('Store')) {
        console.log(`Row ${row}: ${rowStr}`);
        
        if (row > 15 && row < 40) {
          // This might be the product area
          console.log(`\n✅ Checking row ${row} - appears to be product data!\n`);
          
          console.log(`Full row ${row} breakdown:`);
          for (let col = 0; col <= 14; col++) {
            const cellAddr = xlsx.utils.encode_col(col) + row;
            const cell = sheet[cellAddr];
            const value = cell?.v || '';
            console.log(`  ${xlsx.utils.encode_col(col)}: "${value}"`);
          }
          
          console.log(`\nNext 2 rows:`);
          for (let nextRow = row + 1; nextRow <= row + 2; nextRow++) {
            console.log(`\nRow ${nextRow}:`);
            for (let col = 0; col <= 6; col++) {
              const cellAddr = xlsx.utils.encode_col(col) + nextRow;
              const cell = sheet[cellAddr];
              const value = cell?.v || '';
              console.log(`  ${xlsx.utils.encode_col(col)}: "${value}"`);
            }
          }
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findProductsStart();
