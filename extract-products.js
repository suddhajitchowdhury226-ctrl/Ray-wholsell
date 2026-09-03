const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Ray-wholsell-1', 'Master Copy Vitality Works Product List 2026 - RHL Names Elevated.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const allData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find header row
  let headerRowIndex = 10; // We know it's at index 10
  const headers = allData[headerRowIndex];
  
  console.log('📋 Processing products from Excel...\n');
  
  // Map column indices
  const columnMap = {
    productType: 1,
    itemNum: 2,
    rhlProductId: 3,
    rhlGsiBarcode: 4,
    upc: 5,
    productName: 6,
    newRhlProductName: 7,
    description: 8,
    ingredients: 9,
    size: 10,
    wholesalePrice: 11,
    rhlCost: 12,
  };
  
  const products = [];
  
  // Process all data rows (skip header and summary rows)
  for (let i = headerRowIndex + 1; i < allData.length; i++) {
    const row = allData[i];
    
    // Skip empty rows or category headers
    if (!row || !row[columnMap.productName] || typeof row[columnMap.productName] !== 'string') {
      continue;
    }
    
    const productName = row[columnMap.productName];
    
    // Skip category headers (they're usually short and don't have prices)
    if (typeof row[columnMap.wholesalePrice] !== 'number') {
      continue;
    }
    
    const product = {
      upc: row[columnMap.upc] ? String(row[columnMap.upc]).trim() : '',
      rhlProductId: row[columnMap.rhlProductId] ? String(row[columnMap.rhlProductId]).trim() : '',
      name: productName.trim(),
      title: row[columnMap.newRhlProductName] ? row[columnMap.newRhlProductName].trim() : productName.trim(),
      description: row[columnMap.description] ? row[columnMap.description].trim() : '',
      ingredients: row[columnMap.ingredients] ? row[columnMap.ingredients].trim() : '',
      size: row[columnMap.size] ? String(row[columnMap.size]).trim() : '',
      wholesalePrice: parseFloat(row[columnMap.wholesalePrice]) || 0,
      rhlCost: parseFloat(row[columnMap.rhlCost]) || 0,
      productType: row[columnMap.productType] ? String(row[columnMap.productType]).trim() : '',
      itemNum: row[columnMap.itemNum] ? String(row[columnMap.itemNum]).trim() : '',
    };
    
    // Only add valid products with a name and price
    if (product.name && product.wholesalePrice > 0) {
      products.push(product);
    }
  }
  
  // Remove duplicates based on UPC or product name
  const uniqueProducts = [];
  const seen = new Set();
  
  products.forEach(product => {
    const key = product.upc || product.name;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueProducts.push(product);
    }
  });
  
  console.log(`✅ Extracted ${uniqueProducts.length} unique products\n`);
  
  // Save to JSON for review
  const outputPath = path.join(__dirname, 'products-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniqueProducts, null, 2));
  console.log(`📁 Saved to: ${outputPath}`);
  
  // Show sample
  console.log('\n📊 Sample Products (first 3):\n');
  uniqueProducts.slice(0, 3).forEach((product, idx) => {
    console.log(`${idx + 1}. ${product.title}`);
    console.log(`   UPC: ${product.upc}`);
    console.log(`   ID: ${product.rhlProductId}`);
    console.log(`   Price: $${product.wholesalePrice}`);
    console.log(`   Description: ${product.description.substring(0, 80)}...`);
    console.log(`   Ingredients: ${product.ingredients.substring(0, 80)}...`);
    console.log();
  });
  
  console.log(`\n📈 Total products ready for upload: ${uniqueProducts.length}`);
  
} catch (error) {
  console.error('Error processing Excel file:', error.message);
}
