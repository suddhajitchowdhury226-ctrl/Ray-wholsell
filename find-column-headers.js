const xlsx = require('xlsx');
const path = require('path');

async function findHeaders() {
  console.log('🔍 Finding Column Headers...');
  console.log('==================================================\n');

  try {
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    const workbook = xlsx.readFile(excelFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const range = xlsx.utils.decode_range(sheet['!ref']);
    
    // Check rows 1-10 to find headers
    for (let row = 1; row <= 10; row++) {
      let rowData = [];
      for (let col = 0; col < 10; col++) {
        const cellAddr = xlsx.utils.encode_col(col) + row;
        const cell = sheet[cellAddr];
        rowData.push(cell?.v || '');
      }
      
      const rowString = rowData.join(' | ');
      console.log(`Row ${row}: ${rowString}`);
      
      // Check if this looks like a header row
      if (rowData.some(cell => cell && cell.toString().toLowerCase().includes('product'))) {
        console.log(`\n✅ Found potential header row at row ${row}!\n`);
        
        console.log('Detailed column breakdown:');
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        cols.forEach((col, idx) => {
          console.log(`  ${col}: "${rowData[idx]}"`);
        });
        
        // Show next 3 data rows
        console.log('\nFirst 3 data rows:');
        for (let dataRow = row + 1; dataRow <= row + 3; dataRow++) {
          let data = [];
          for (let col = 0; col < 10; col++) {
            const cellAddr = xlsx.utils.encode_col(col) + dataRow;
            const cell = sheet[cellAddr];
            data.push(cell?.v || '');
          }
          console.log(`\nRow ${dataRow} (Data):`);
          cols.forEach((col, idx) => {
            console.log(`  ${col}: "${data[idx]}"`);
          });
        }
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findHeaders();
