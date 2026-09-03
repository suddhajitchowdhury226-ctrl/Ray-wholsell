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

async function syncProductDescriptions() {
  console.log('🚀 Starting product description sync from Excel...');
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

    // Based on the screenshot:
    // Column A = PRODUCT NAME (e.g., "Adrenal Rx Powder Capsules")
    // Column D = Product Description (e.g., "Herbal Handbook, Clinical Monographs From A Medical Herbalist")
    
    // Data starts at row 6
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const startRow = 6;

    console.log(`Processing products from row ${startRow}...\n`);

    for (let row = startRow; row <= range.e.r + 1; row++) {
      try {
        // Get PRODUCT NAME (Column A)
        const productNameCell = sheet[`A${row}`];
        const productName = productNameCell ? productNameCell.v : null;

        // Get Description (Column D)
        const descriptionCell = sheet[`D${row}`];
        const description = descriptionCell ? descriptionCell.v : null;

        // Skip if no product name
        if (!productName || productName.toString().trim() === '') {
          break; // End of data
        }

        // Find product by name (try different variations)
        let product = await Product.findOne({ 
          $or: [
            { name: productName.toString().trim() },
            { originalProductName: productName.toString().trim() }
          ]
        });

        if (product) {
          const updates = {
            originalProductName: productName.toString().trim(),
            productDescription: description ? description.toString().trim() : '',
            name: productName.toString().trim()
          };

          await Product.findByIdAndUpdate(product._id, updates, { new: true });
          updatedCount++;

          if ((updatedCount + skippedCount) % 50 === 0) {
            console.log(`  ✅ Processed ${updatedCount + skippedCount} rows... (${updatedCount} updated)`);
          }

          // Show first few matches
          if (updatedCount <= 5) {
            console.log(`\n  ✅ Row ${row}: "${productName}"`);
            if (description) {
              console.log(`     Description: "${description}"\n`);
            }
          }
        } else {
          skippedCount++;
          if (skippedCount <= 5) {
            console.warn(`  ⚠️  Row ${row}: Product not found - "${productName}"`);
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

    console.log('\n✨ Product descriptions will now display:');
    console.log('  - Below the product name');
    console.log('  - Smaller text, gray color');
    console.log('  - Example: "Powder Capsules" or "Herbal Handbook, Clinical Monographs"');

  } catch (error) {
    console.error('❌ Process error:', error.message);
  }
}

async function main() {
  await connectDB();
  await syncProductDescriptions();

  console.log('\n==================================================');
  console.log('✅ Product description sync completed!');
  console.log('==================================================\n');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
