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

async function fixProductNamesFromExcel() {
  console.log('🚀 Starting product name correction from Excel...');
  console.log('==================================================');

  try {
    // Read the Excel file
    const excelFilePath = path.join(__dirname, 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');
    
    if (!require('fs').existsSync(excelFilePath)) {
      console.error('❌ Excel file not found:', excelFilePath);
      process.exit(1);
    }

    const workbook = xlsx.readFile(excelFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${rows.length} products in Excel file`);
    console.log(`📋 Column headers: ${Object.keys(rows[0] || {}).join(', ')}`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Identify the key columns from the Excel file
        // Common possible names for these fields
        const productNameCol = row['PRODUCT NAME'] || row['Product Name'] || row['Name'] || row['name'];
        const rhlProductNameCol = row['New RHL Product Name'] || row['RHL Product Name'] || row['rhlProductName'];
        const rhlProductIdCol = row['RHL ID'] || row['RHL_ID'] || row['rhlProductId'];
        const upcCol = row['UPC'] || row['Barcode'] || row['lookup_code'];

        if (!productNameCol) {
          console.warn(`  ⚠️  Row ${i + 1}: No PRODUCT NAME found`);
          notFoundCount++;
          continue;
        }

        // Find product by RHL ID or by RHL Product Name
        let product = null;

        if (rhlProductIdCol) {
          product = await Product.findOne({ rhlProductId: rhlProductIdCol.toString() });
        }

        if (!product && rhlProductNameCol) {
          product = await Product.findOne({ name: rhlProductNameCol });
        }

        if (!product && productNameCol) {
          // Try to find by original name or other identifiers
          product = await Product.findOne({ 
            $or: [
              { originalProductName: productNameCol },
              { name: productNameCol },
              { lookup_code: upcCol }
            ]
          });
        }

        if (product) {
          // Update product with correct names
          const updates = {
            originalProductName: productNameCol,
            rhlProductName: rhlProductNameCol || product.name,
            // Keep name as the display name
            name: productNameCol // Changed: now using original product name as the main display name
          };

          if (rhlProductIdCol) {
            updates.rhlProductId = rhlProductIdCol.toString();
          }

          await Product.findByIdAndUpdate(product._id, updates, { new: true });
          updatedCount++;

          if ((updatedCount + notFoundCount) % 50 === 0) {
            console.log(`  ✅ Processed ${updatedCount + notFoundCount}/${rows.length} rows...`);
          }
        } else {
          notFoundCount++;
          if (i < 5) {
            console.warn(`  ⚠️  Row ${i + 1}: Product not found - "${productNameCol}"`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Row ${i + 1} error:`, error.message.substring(0, 80));
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successfully updated: ${updatedCount} products`);
    console.log(`  ⚠️  Not found: ${notFoundCount} products`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${updatedCount + notFoundCount + errorCount}/${rows.length}`);

  } catch (error) {
    console.error('❌ Process error:', error.message);
  }
}

async function main() {
  await connectDB();
  await fixProductNamesFromExcel();

  console.log('==================================================');
  console.log('✅ Product name correction completed!');
  console.log('==================================================\n');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
