const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: './.env' });

const Product = require('./Models/productModel');

async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ DB Connection Error:', error.message);
    process.exit(1);
  }
}

async function syncProductNamesFromExcel() {
  console.log('🚀 Starting product name sync from Excel...');
  console.log('==================================================\n');

  try {
    // Read the Excel file
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    
    if (!require('fs').existsSync(excelFilePath)) {
      console.error('❌ Excel file not found:', excelFilePath);
      process.exit(1);
    }

    const workbook = xlsx.readFile(excelFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    console.log(`📋 Sheet name: "${workbook.SheetNames[0]}"`);
    
    // Get range
    const range = xlsx.utils.decode_range(sheet['!ref']);
    console.log(`📊 Range: ${sheet['!ref']}\n`);

    // The data starts at row 6 (based on your screenshot)
    // Column A = PRODUCT NAME
    // Column B = New RHL Product Name
    // Rows 1-5 are headers/info

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const startRow = 6; // Data starts at row 6

    console.log(`Processing products from row ${startRow}...\n`);

    for (let row = startRow; row <= range.e.r + 1; row++) {
      try {
        // Get PRODUCT NAME (Column A)
        const productNameCell = sheet[`A${row}`];
        const productName = productNameCell ? productNameCell.v : null;

        // Get New RHL Product Name (Column B)
        const rhlNameCell = sheet[`B${row}`];
        const rhlProductName = rhlNameCell ? rhlNameCell.v : null;

        // Skip if no product name
        if (!productName || productName.toString().trim() === '') {
          break; // End of data
        }

        // Find product by RHL name (since that's what's currently in the database)
        let product = await Product.findOne({ name: rhlProductName });

        if (!product && productName) {
          // Try finding by product name as fallback
          product = await Product.findOne({ name: productName });
        }

        if (product) {
          // Update with correct names
          const updates = {
            originalProductName: productName.toString().trim(),
            rhlProductName: rhlProductName ? rhlProductName.toString().trim() : product.name,
            name: productName.toString().trim() // Set display name to original product name
          };

          await Product.findByIdAndUpdate(product._id, updates, { new: true });
          updatedCount++;

          if ((updatedCount + skippedCount) % 100 === 0) {
            console.log(`  ✅ Processed ${updatedCount + skippedCount} rows...`);
          }
        } else {
          skippedCount++;
          if (skippedCount <= 10) {
            console.warn(`  ⚠️  Row ${row}: Product not found - "${rhlProductName}" / "${productName}"`);
          }
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`  ❌ Row ${row} error:`, error.message.substring(0, 80));
        }
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`  ✅ Successfully updated: ${updatedCount} products`);
    console.log(`  ⚠️  Not found/skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${updatedCount + skippedCount + errorCount}`);

    console.log('\n✨ Product names now display:');
    console.log('  - Original PRODUCT NAME on website');
    console.log('  - New RHL Product Name stored as backup');

  } catch (error) {
    console.error('❌ Process error:', error.message);
  }
}

async function main() {
  await connectDB();
  await syncProductNamesFromExcel();

  console.log('\n==================================================');
  console.log('✅ Product name sync completed!');
  console.log('==================================================\n');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
