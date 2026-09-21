require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const productModel = require('./Models/productModel');

async function populateDepartmentsAndCategories() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    const updates = [];
    let processedCount = 0;
    let errorCount = 0;

    // Read CSV file
    console.log('📖 Reading CSV file...\n');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('RHL 1 Items  July 21 26(Sheet1).csv')
        .pipe(csv())
        .on('data', (row) => {
          const itemLookupCode = row['Item Lookup Code'];
          const department = row['Departments']?.trim();
          const category = row['Categories']?.trim();

          if (itemLookupCode && (department || category)) {
            updates.push({
              rhlUpc: itemLookupCode,
              department: department || null,
              category: category || null
            });
          }
        })
        .on('end', async () => {
          console.log(`📊 Found ${updates.length} products to update\n`);

          // Update products
          for (const update of updates) {
            try {
              const updateData = {};
              if (update.department) updateData.department = update.department;
              if (update.category) updateData.category = update.category;

              const result = await productModel.updateOne(
                { 'variants.rhlUpc': update.rhlUpc },
                { $set: updateData }
              );

              if (result.modifiedCount > 0) {
                processedCount++;
                console.log(`✅ Updated product with UPC ${update.rhlUpc}: ${update.department} > ${update.category}`);
              }
            } catch (err) {
              errorCount++;
              console.error(`❌ Error updating UPC ${update.rhlUpc}:`, err.message);
            }
          }

          console.log('\n' + '='.repeat(60));
          console.log(`✅ Update Complete!`);
          console.log(`   - Products updated: ${processedCount}`);
          console.log(`   - Errors: ${errorCount}`);
          console.log(`   - Total processed: ${updates.length}`);
          console.log('='.repeat(60));

          await mongoose.disconnect();
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV:', error);
          reject(error);
        });
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateDepartmentsAndCategories();
