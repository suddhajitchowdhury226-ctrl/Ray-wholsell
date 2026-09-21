require('dotenv').config();
const mongoose = require('mongoose');
const productModel = require('./Models/productModel');

async function checkDepartmentData() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Count total products
    const totalProducts = await productModel.countDocuments({ status: 'active' });
    console.log(`📊 Total active products: ${totalProducts}`);

    // Count products WITH department
    const productsWithDept = await productModel.countDocuments({ 
      status: 'active',
      department: { $exists: true, $ne: null }
    });
    console.log(`✅ Products WITH department: ${productsWithDept}`);

    // Count products WITHOUT department
    const productsWithoutDept = await productModel.countDocuments({ 
      status: 'active',
      $or: [
        { department: { $exists: false } },
        { department: null }
      ]
    });
    console.log(`❌ Products WITHOUT department: ${productsWithoutDept}\n`);

    // List all unique departments
    const departments = await productModel.distinct('department', { 
      status: 'active',
      department: { $exists: true, $ne: null }
    });
    console.log(`📁 Unique departments (${departments.length}):`);
    departments.forEach(dept => {
      console.log(`   - ${dept}`);
    });

    console.log('\n' + '='.repeat(60));

    // Count products per department
    console.log('📊 Products per department:\n');
    for (const dept of departments) {
      const count = await productModel.countDocuments({ 
        status: 'active',
        department: dept 
      });
      console.log(`   ${dept}: ${count} products`);
    }

    // Check "VITAMINS A - Z" specifically
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Checking "VITAMINS A - Z" department:\n');
    
    const vitaminProducts = await productModel.find({ 
      status: 'active',
      department: 'VITAMINS A - Z'
    }).limit(5);

    console.log(`   Found ${vitaminProducts.length} products:`);
    vitaminProducts.forEach(p => {
      console.log(`   - ${p.name} (Category: ${p.category})`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDepartmentData();
