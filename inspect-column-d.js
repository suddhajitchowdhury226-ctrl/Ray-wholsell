const xlsx = require('xlsx');
const path = require('path');

async function inspectColumnD() {
  console.log('🔍 Inspecting Column D from Excel...');
  console.log('==================================================\n');

  try {
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    const workbook = xlsx.readFile(excelFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const range = xlsx.utils.decode_range(sheet['!ref']);
    
    // Show header row
    console.log('📋 Column Headers (Row 5):');
    console.log(`  A: ${sheet['A5']?.v}`);
    console.log(`  B: ${sheet['B5']?.v}`);
    console.log(`  C: ${sheet['C5']?.v}`);
    console.log(`  D: ${sheet['D5']?.v}`);
    console.log(`  E: ${sheet['E5']?.v}`);
    console.log(`  F: ${sheet['F5']?.v}`);
    console.log(`  G: ${sheet['G5']?.v}\n`);

    // Show first 10 data rows with Column D
    console.log('📊 First 10 Products with Column D data:\n');
    for (let row = 6; row <= 15; row++) {
      const colA = sheet[`A${row}`]?.v || '';
      const colD = sheet[`D${row}`]?.v || '';
      
      if (colA && colA.toString().trim() !== '') {
        console.log(`Row ${row}:`);
        console.log(`  A (Product Name): "${colA}"`);
        console.log(`  D: "${colD}"\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectColumnD();
