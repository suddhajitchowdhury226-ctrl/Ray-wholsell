// Database indexes for performance optimization
const productModel = require('../Models/productModel');
const categoryModel = require('../Models/categoryModel');
const retailerCategoryModel = require('../Models/retailerCategoryModel');
const user = require('../Models/user');

const createIndexes = async () => {
  try {
    // Product indexes
    await productModel.collection.createIndex({ createdBy: 1, category: 1 });
    await productModel.collection.createIndex({ createdBy: 1, stock: 1 });
    await productModel.collection.createIndex({ category: 1, sellPrice: 1 });
    await productModel.collection.createIndex({ name: 'text', description: 'text', sku: 'text' });
    await productModel.collection.createIndex({ createdAt: -1 });
    await productModel.collection.createIndex({ sku: 1 }, { sparse: true });
    
    // User indexes
    await user.collection.createIndex({ role: 1 });
    await user.collection.createIndex({ email: 1 }, { unique: true });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

module.exports = createIndexes;
