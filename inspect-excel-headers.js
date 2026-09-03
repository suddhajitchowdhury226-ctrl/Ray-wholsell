const xlsx = require('xlsx');
const path = require('path');

async function inspectExcelHeaders() {
  console.log('🔍 Inspecting Excel file structure...');
  console.log('==================================================\n');

  try {
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    const workbook = xlsx.readFile(excelFilePath);
    
    console.log(`📋 Sheet names: ${workbook.SheetNames.join(', ')}`);
    console.log(`\n📊 Analyzing sheet: "${workbook.SheetNames[0]}"\n`);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const range = xlsx.utils.decode_range(sheet['!ref']);
    console.log(`Range: ${sheet['!ref']}`);
    console.log(`Rows: ${range.s.r + 1} to ${range.e.r + 1}, Columns: ${range.s.c} to ${range.e.c}\n`);

    // Search for the actual headers by looking for common product field names
    console.log('🔍 Searching for actual product headers...\n');
    
    for (let row = 1; row <= 50; row++) {
      const firstCell = sheet[`A${row}`];
      const firstValue = firstCell ? firstCell.v : '';
      
      // Check if this row contains product-related headers
      let headers = [];
      for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 20); col++) {
        const cellAddr = xlsx.utils.encode_col(col) + row;
        const cell = sheet[cellAddr];
        const value = cell ? cell.v : '';
        if (value && value.toString().length > 0) {
          headers.push(`${xlsx.utils.encode_col(col)}: ${value}`);
        }
      }
      
      if (firstValue && firstValue.toString().toLowerCase().includes('product')) {
        console.log(`✅ Found potential headers at Row ${row}:`);
        headers.forEach(h => console.log(`  ${h}`));
        
        // Show next 3 data rows
        console.log(`\n  Next 3 rows of data:`);
        for (let dataRow = row + 1; dataRow <= row + 3; dataRow++) {
          let rowData = [];
          for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 8); col++) {
            const cellAddr = xlsx.utils.encode_col(col) + dataRow;
            const cell = sheet[cellAddr];
            const value = cell ? cell.v : '';
            rowData.push(value);
          }
          console.log(`    Row ${dataRow}: ${rowData.join(' | ')}`);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectExcelHeaders();
