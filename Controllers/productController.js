const mongoose = require('mongoose');
const productModel = require('../Models/productModel');
const categoryModel = require('../Models/categoryModel');
const subcategoryModel = require('../Models/subcategoryModel');
const retailerCategoryModel = require('../Models/retailerCategoryModel');
const retailerSubcategoryModel = require('../Models/retailerSubcategoryModel');
const brandModel = require('../Models/brandModel');
const fs = require('fs');
const path = require('path');
const user = require('../Models/user');
const bulkOrderModel = require('../Models/bulkOrderModel');
const multer = require('multer');
const csv = require('csv-parser');

const createProduct = async (req, res) => {
  try {
  const { name, sku, buyPrice, sellPrice, stock, category, subcategory, brand, dimensions, weight, weight_value, description, additional, ingredient, disclaimer, bin_location, length, width, height, item_number, lookup_code, reorder, supplierName, variants } = req.body;
    
    console.log('Reorder field received:', reorder, 'Type:', typeof reorder);
    const images = req.files ? req.files.map(file => file.path) : [];

    // Only check required fields (category only)
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    let parsedWeight = undefined;
    if (weight) {
      try {
        parsedWeight = JSON.parse(weight);
      } catch (e) {
        parsedWeight = undefined;
      }
    }
    // Helper to parse and validate number fields
    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return !isNaN(num) ? num : undefined;
    };
    const productData = {
      name,
      sku,
      buyPrice: parseNumber(buyPrice),
      sellPrice: parseNumber(sellPrice),
      stock: parseNumber(stock),
      category,
      subcategory: subcategory || null, // Set to null if not provided
      brand: brand || null, // Set to null if not provided
      dimensions: dimensions ? JSON.parse(dimensions) : undefined,
      description,
      additional,
      ingredient,
      disclaimer,
      bin_location,
      images,
      createdBy: req.user._id,
    item_number: item_number || undefined,
    lookup_code: lookup_code || undefined,
    supplierName: supplierName || undefined,
    variants: variants ? JSON.parse(variants).map(v => ({ ...v, price: v.price ? parseFloat(v.price) : undefined, stock: v.stock ? parseInt(v.stock, 10) : undefined })) : [],
    };
    
    // Only add reorder if it has a valid value
    const reorderValue = parseNumber(reorder);
    console.log('Parsed reorder value:', reorderValue);
    if (reorderValue !== undefined && reorderValue >= 0) {
      productData.reorder = reorderValue;
      console.log('Added reorder to productData:', reorderValue);
    }
    // Only set these fields if valid
    const l = parseNumber(length);
    if (l !== undefined) productData.length = l;
    const w = parseNumber(width);
    if (w !== undefined) productData.width = w;
    const h = parseNumber(height);
    if (h !== undefined) productData.height = h;
    const wt = parseNumber(weight_value);
    if (wt !== undefined) productData.weight = wt;
    const product = await productModel.create(productData);

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
  const { name, sku, buyPrice, sellPrice, stock, category, subcategory, brand, existingImages, description, additional, ingredient, disclaimer, bin_location, length, width, height, weight_value, weight, item_number, lookup_code, reorder, supplierName, variants } = req.body;
    const newImages = req.files.length > 0 ? req.files.map(file => file.path) : [];
    const retainedImages = existingImages ? (typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages) : [];

    const existingProduct = await productModel.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only check required fields (category only)
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    let parsedWeight = undefined;
    if (weight) {
      try {
        parsedWeight = JSON.parse(weight);
      } catch (e) {
        parsedWeight = undefined;
      }
    }
    // Helper to safely parse numbers, returning undefined for invalid values
    const safeParseFloat = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return !isNaN(num) ? num : undefined;
    };
    
    const safeParseInt = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseInt(val, 10);
      return !isNaN(num) ? num : undefined;
    };

    const updateData = {
      name,
      sku,
      category,
      subcategory: subcategory || null, // Set to null if not provided
      brand: brand || null, // Set to null if not provided
      description,
      additional,
      ingredient,
      disclaimer,
      bin_location,
      images: [...retainedImages, ...newImages],
      supplierName: supplierName || undefined,
      variants: variants ? JSON.parse(variants).map(v => ({ ...v, price: safeParseFloat(v.price), stock: safeParseInt(v.stock) })) : undefined,
    };

    // Only update price/stock fields if they have valid values
    const parsedBuyPrice = safeParseFloat(buyPrice);
    if (parsedBuyPrice !== undefined) updateData.buyPrice = parsedBuyPrice;
    
    const parsedSellPrice = safeParseFloat(sellPrice);
    if (parsedSellPrice !== undefined) updateData.sellPrice = parsedSellPrice;
    
    const parsedStock = safeParseInt(stock);
    if (parsedStock !== undefined) updateData.stock = parsedStock;
    
    const parsedReorder = safeParseFloat(reorder);
    if (parsedReorder !== undefined) updateData.reorder = parsedReorder;

    // Only update dimensions and weight if they are provided
    if (length !== undefined && length !== '' && length !== null) {
      updateData.length = parseFloat(length);
    }
    if (width !== undefined && width !== '' && width !== null) {
      updateData.width = parseFloat(width);
    }
    if (height !== undefined && height !== '' && height !== null) {
      updateData.height = parseFloat(height);
    }
    if (weight_value !== undefined && weight_value !== '' && weight_value !== null) {
      updateData.weight = parseFloat(weight_value);
    }
    if (item_number !== undefined && item_number !== '' && item_number !== null) {
      updateData.item_number = item_number;
    }
    if (lookup_code !== undefined && lookup_code !== '' && lookup_code !== null) {
      updateData.lookup_code = lookup_code;
    }
    if (reorder !== undefined && reorder !== '' && reorder !== null) {
      updateData.reorder = parseFloat(reorder);
    }

    const imagesToDelete = existingProduct.images.filter(img => !retainedImages.includes(img));
    imagesToDelete.forEach(img => {
      const imagePath = path.join(__dirname, '..', img);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    const product = await productModel
      .findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate({
        path: 'category',
        select: 'name image',
        model: 'RetailerCategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'subcategory',
        select: 'name',
        model: 'RetailerSubcategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'brand',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate('createdBy', 'name role');

    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'No valid products provided' });
    }

    const createdProducts = [];
    const errors = [];

    for (const productData of products) {
      try {
        const { name, buyPrice, sellPrice, stock, category, dimensions, weight } = productData;

        // Log the product data being processed
        console.log(`Processing product: ${name}`, { buyPrice, sellPrice, stock, category });

        // Validate required fields (category only)
        if (!category) {
          errors.push({ product: name || 'Unknown', message: 'Missing required category' });
          console.log(`Error for ${name}: Missing required category`);
          continue;
        }

        // Validate numeric fields
        const parsedBuyPrice = parseFloat(buyPrice);
        const parsedSellPrice = parseFloat(sellPrice);
        const parsedStock = parseInt(stock);

        if (isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
          errors.push({ product: name || 'Unknown', message: 'Invalid buyPrice: must be a positive number' });
          console.log(`Error for ${name}: Invalid buyPrice`);
          continue;
        }
        if (isNaN(parsedSellPrice) || parsedSellPrice < 0) {
          errors.push({ product: name || 'Unknown', message: 'Invalid sellPrice: must be a positive number' });
          console.log(`Error for ${name}: Invalid sellPrice`);
          continue;
        }
        if (isNaN(parsedStock) || parsedStock < 0) {
          errors.push({ product: name || 'Unknown', message: 'Invalid stock: must be a non-negative integer' });
          console.log(`Error for ${name}: Invalid stock`);
          continue;
        }

        // Validate category ID
        const isValidObjectId = mongoose.Types.ObjectId.isValid(category);
        if (!isValidObjectId) {
          errors.push({ product: name || 'Unknown', message: 'Invalid category ID format' });
          console.log(`Error for ${name}: Invalid category ID format - ${category}`);
          continue;
        }

        const categoryExists = await categoryModel.findById(category);
        if (!categoryExists) {
          errors.push({ product: name || 'Unknown', message: `Category ID ${category} does not exist` });
          console.log(`Error for ${name}: Category ID ${category} does not exist`);
          continue;
        }

        // Validate dimensions and weight JSON
        let parsedDimensions = dimensions;
        if (typeof dimensions === 'string') {
          try {
            parsedDimensions = JSON.parse(dimensions);
          } catch (err) {
            errors.push({ product: name || 'Unknown', message: `Invalid dimensions JSON: ${err.message}` });
            console.log(`Error for ${name}: Invalid dimensions JSON - ${err.message}`);
            continue;
          }
        }

        let parsedWeight = weight;
        if (typeof weight === 'string') {
          try {
            parsedWeight = JSON.parse(weight);
          } catch (err) {
            errors.push({ product: name || 'Unknown', message: `Invalid weight JSON: ${err.message}` });
            console.log(`Error for ${name}: Invalid weight JSON - ${err.message}`);
            continue;
          }
        }

        const product = await productModel.create({
          name,
          buyPrice: parsedBuyPrice,
          sellPrice: parsedSellPrice,
          stock: parsedStock,
          category,
          dimensions: parsedDimensions,
          weight: parsedWeight,
          images: [], // Images not supported in CSV upload
          createdBy: req.user._id,
        });

        createdProducts.push(product);
      } catch (error) {
        errors.push({ product: productData.name || 'Unknown', message: error.message });
        console.log(`Error creating product ${productData.name || 'Unknown'}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: `Bulk upload completed: ${createdProducts.length} products created, ${errors.length} errors`,
      createdProducts,
      errors,
    });
  } catch (error) {
    console.error('Bulk upload failed:', error);
    res.status(400).json({ message: error.message });
  }
};

// CSV Bulk Upload Products
const bulkUploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              processedCount++;
              
              // Extract and validate required fields
              const {
                item_number,
                lookup_code,
                sku,
                brand: brandName,
                name,
                description,
                bin_location,
                buyPrice,
                stock,
                sellPrice,
                category: categoryName,
                subcategory: subcategoryName,
                images,
                length,
                width,
                height,
                weight,
                additional,
                ingredient,
                disclaimer,
                reorder,
                supplierName
              } = row;

              // Validate required fields (category only)
              if (!categoryName) {
                errors.push({
                  row: processedCount,
                  product: name || 'Unknown',
                  message: 'Missing required field: category'
                });
                continue;
              }

              // Parse numeric fields
              const parsedBuyPrice = parseFloat(buyPrice);
              const parsedSellPrice = parseFloat(sellPrice);
              const parsedStock = parseInt(stock);
              const parsedLength = length ? parseFloat(length) : undefined;
              const parsedWidth = width ? parseFloat(width) : undefined;
              const parsedHeight = height ? parseFloat(height) : undefined;
              const parsedWeight = weight ? parseFloat(weight) : undefined;

              if (isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid buyPrice: must be a positive number'
                });
                continue;
              }

              if (isNaN(parsedSellPrice) || parsedSellPrice < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid sellPrice: must be a positive number'
                });
                continue;
              }

              if (isNaN(parsedStock) || parsedStock < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid stock: must be a non-negative integer'
                });
                continue;
              }

              // Find category by name
              const category = await categoryModel.findOne({ name: categoryName.trim() });
              if (!category) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: `Category '${categoryName}' not found`
                });
                continue;
              }

              // Find subcategory by name (optional)
              let subcategory = null;
              if (subcategoryName && subcategoryName.trim()) {
                subcategory = await subcategoryModel.findOne({ name: subcategoryName.trim() });
                if (!subcategory) {
                  errors.push({
                    row: processedCount,
                    product: name,
                    message: `Subcategory '${subcategoryName}' not found - creating product without subcategory`
                  });
                }
              }

              // Find brand by name (optional)
              let brand = null;
              if (brandName && brandName.trim()) {
                brand = await brandModel.findOne({ name: brandName.trim() });
                if (!brand) {
                  errors.push({
                    row: processedCount,
                    product: name,
                    message: `Brand '${brandName}' not found - creating product without brand`
                  });
                }
              }

              // Process images (split by comma if multiple URLs)
              const imageArray = images && images.trim() ? 
                images.split(',').map(img => img.trim()).filter(img => img) : [];

              // Create product
              const productData = {
                item_number: item_number || undefined,
                lookup_code: lookup_code || undefined,
                name: name.trim(),
                sku: sku || undefined,
                buyPrice: parsedBuyPrice,
                sellPrice: parsedSellPrice,
                stock: parsedStock,
                category: category._id,
                subcategory: subcategory ? subcategory._id : undefined,
                brand: brand ? brand._id : undefined,
                images: imageArray,
                description: description || undefined,
                additional: additional || undefined,
                ingredient: ingredient || undefined,
                disclaimer: disclaimer || undefined,
                bin_location: bin_location || undefined,
                length: parsedLength,
                width: parsedWidth,
                height: parsedHeight,
                weight: parsedWeight,
                reorder: reorder || undefined,
                supplierName: supplierName || undefined,
                createdBy: req.user._id
              };

              // Remove undefined fields
              Object.keys(productData).forEach(key => {
                if (productData[key] === undefined) {
                  delete productData[key];
                }
              });

              const product = await productModel.create(productData);
              
            } catch (error) {
              errors.push({
                row: processedCount,
                product: row.name || 'Unknown',
                message: error.message
              });
            }
          }

          // Delete uploaded file
          fs.unlinkSync(req.file.path);

          const successCount = processedCount - errors.length;
          
          res.status(201).json({
            message: `CSV upload completed: ${successCount} products created, ${errors.length} errors`,
            totalProcessed: processedCount,
            successCount,
            errorCount: errors.length,
            errors: errors.slice(0, 10) // Return first 10 errors to avoid large response
          });

        } catch (error) {
          // Delete uploaded file in case of error
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          res.status(500).json({
            message: 'Error processing CSV file',
            error: error.message
          });
        }
      })
      .on('error', (error) => {
        // Delete uploaded file in case of error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
          message: 'Error reading CSV file',
          error: error.message
        });
      });

  } catch (error) {
    console.error('CSV upload failed:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAddedProducts = async (req, res) => {
  try {
    // Get user info to determine role-based population
    const userId = req.user ? req.user._id : null;
    let userRole = null;
    
    if (userId) {
      const currentUser = await user.findById(userId).select('role');
      userRole = currentUser ? currentUser.role : null;
    }

    let products;
    
    if (userRole === 'retailer') {
      // For retailers, use RetailerCategory and RetailerSubcategory models
      products = await productModel
        .find()
        .populate({
          path: 'category',
          select: 'name image',
          model: 'RetailerCategory',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'subcategory',
          select: 'name',
          model: 'RetailerSubcategory',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'brand',
          select: 'name',
          options: { strictPopulate: false }
        })
        .populate('createdBy', 'name role');
    } else {
      // For wholesalers or other roles, use regular models
      products = await productModel
        .find()
        .populate('category', 'name image')
        .populate('subcategory', 'name')
        .populate('brand', 'name')
        .populate('createdBy', 'name role');
    }
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error in getAddedProducts:', error);
    res.status(500).json({ message: error.message });
  }
};



///updsated

const getProductsByWholesalerRetailor = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search = '' } = req.query;
    const userId = req.user._id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!['wholesaler', 'retailer', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be wholesaler, retailer, or user.' });
    }

    let query = {};
    if (role === 'wholesaler') {
      query = { createdBy: userId };
    } else if (role === 'retailer' || role === 'user') {
      const wholesalers = await user.find({ role: 'wholesaler' }).select('_id');
      const wholesalerIds = wholesalers.map((user) => user._id);
      query = { createdBy: { $in: wholesalerIds } };
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { sku: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const totalProducts = await productModel.countDocuments(query);

    const products = await productModel
      .find(query)
      .populate('category', 'name image')
      .populate('subcategory', 'name')
      .populate('brand', 'name')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      products,
      totalProducts,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};


//retailer

const getProductsByRetailer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { createdBy: userId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const totalProducts = await productModel.countDocuments(query);

    const products = await productModel
      .find(query)
      .populate({
        path: 'category',
        model: 'RetailerCategory',
        select: 'name image',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'subcategory', 
        model: 'RetailerSubcategory',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'brand',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      products,
      totalProducts,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getRetailerProducts = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;

    // Validate role
    if (role !== 'retailer') {
      return res.status(400).json({ message: 'Invalid role. Must be retailer.' });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const limitNumber = parseInt(limit);

    // Fetch users with role 'retailer'
    const retailerUsers = await user.find({ role: 'retailer' }).select('_id');

    // Extract user IDs
    const retailerUserIds = retailerUsers.map(user => user._id);

    // Fetch products created by retailer users with pagination
    const products = await productModel
      .find({ createdBy: { $in: retailerUserIds } })
      .populate({
        path: 'category',
        select: 'name image',
        model: 'RetailerCategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'subcategory',
        select: 'name',
        model: 'RetailerSubcategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'brand',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count for pagination metadata
    const totalProducts = await productModel.countDocuments({ createdBy: { $in: retailerUserIds } });

    res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
    });
  } catch (error) {
    console.error('Error in getRetailerProducts:', error);
    res.status(500).json({ message: error.message });
  }
};


//retailer by category
const getRetailerProductsByCategory = async (req, res) => {
  try {
    const { role, categoryId, page = 1, limit = 10 } = req.query;

    // Validate role
    if (role !== 'retailer') {
      return res.status(400).json({ message: 'Invalid role. Must be retailer.' });
    }

    // Validate categoryId
    if (!categoryId) {
      return res.status(400).json({ message: 'Category ID is required.' });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const limitNumber = parseInt(limit);

    // Fetch users with role 'retailer'
    const retailerUsers = await user.find({ role: 'retailer' }).select('_id');

    // Extract user IDs
    const retailerUserIds = retailerUsers.map(user => user._id);

    // Fetch products created by retailer users with category filter and pagination
    const products = await productModel
      .find({ 
        createdBy: { $in: retailerUserIds },
        category: categoryId 
      })
      .populate('category', 'name')
      .populate('createdBy', 'name role')
      .skip(skip)
      .limit(limitNumber);

    // Get total count for pagination metadata
    const totalProducts = await productModel.countDocuments({ 
      createdBy: { $in: retailerUserIds },
      category: categoryId 
    });

    res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//wholesala
// const getWholesalerProducts = async (req, res) => {
//   try {
//     const { role, page = 1, limit = 8 } = req.query;

//     // Validate role
//     if (role !== 'wholesaler') {
//       return res.status(400).json({ message: 'Invalid role. Must be wholesaler.' });
//     }

//     // Calculate pagination
//     const skip = (page - 1) * limit;
//     const limitNumber = parseInt(limit);

//     // Fetch users with role 'wholesaler'
//     const wholesalerUsers = await user.find({ role: 'wholesaler' }).select('_id');

//     // Extract user IDs
//     const wholesalerUserIds = wholesalerUsers.map(user => user._id);

//     // Fetch products created by wholesaler users with pagination
//     const products = await productModel
//       .find({ createdBy: { $in: wholesalerUserIds } })
//       .populate('category', 'name')
//       .populate('createdBy', 'name role')
//       .skip(skip)
//       .limit(limitNumber);

//     // Get total count for pagination metadata
//     const totalProducts = await productModel.countDocuments({ createdBy: { $in: wholesalerUserIds } });

//     res.status(200).json({
//       products,
//       currentPage: parseInt(page),
//       totalPages: Math.ceil(totalProducts / limitNumber),
//       totalProducts,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


const getWholesalerProducts = async (req, res) => {
  try {
    const { role, page = 1, limit = 7 } = req.query;

    // Validate role
    if (role !== 'wholesaler') {
      return res.status(400).json({ message: 'Invalid role. Must be wholesaler.' });
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch users with role 'wholesaler'
    const wholesalerUsers = await user.find({ role: 'wholesaler' }).select('_id');
    const bulkCount = await bulkOrderModel.find({});
    const bulkOrderNumber = bulkCount[0]?.bulkOrderNumber || 1;

    // Extract user IDs
    const wholesalerUserIds = wholesalerUsers.map(user => user._id);

    // Fetch products created by wholesaler users with pagination
    const products = await productModel
      .find({ createdBy: { $in: wholesalerUserIds } })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination metadata
    const totalProducts = await productModel.countDocuments({ createdBy: { $in: wholesalerUserIds } });

    res.status(200).json({
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
      totalProducts,
      bulkOrderNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const getWholesalerProductsByCategory = async (req, res) => {
  try {
    const { role, categoryId, page = 1, limit = 10 } = req.query;

    // Validate role
    if (role !== 'wholesaler') {
      return res.status(400).json({ message: 'Invalid role. Must be wholesaler.' });
    }

    // Validate categoryId
    if (!categoryId) {
      return res.status(400).json({ message: 'Category ID is required.' });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const limitNumber = parseInt(limit);

    // Fetch users with role 'wholesaler'
    const wholesalerUsers = await user.find({ role: 'wholesaler' }).select('_id');

    // Extract user IDs
    const wholesalerUserIds = wholesalerUsers.map(user => user._id);

    // Fetch products created by wholesaler users with category filter and pagination
    const products = await productModel
      .find({ 
        createdBy: { $in: wholesalerUserIds },
        category: categoryId 
      })
      .populate('category', 'name')
      .populate('createdBy', 'name role')
      .skip(skip)
      .limit(limitNumber);

    // Get total count for pagination metadata
    const totalProducts = await productModel.countDocuments({ 
      createdBy: { $in: wholesalerUserIds },
      category: categoryId 
    });

    res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





const getProductss = async (req, res) => {
  try {
    const { role, page = 1, limit = 100, category, minPrice, maxPrice, sortBy } = req.query;

    // Build query object
    const query = { role };
    if (category) {
      query.category = category; // Match category._id
    }
    if (minPrice) {
      query.sellPrice = { ...query.sellPrice, $gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      query.sellPrice = { ...query.sellPrice, $lte: parseFloat(maxPrice) };
    }

    // Sorting
    const sort = {};
    if (sortBy && sortBy !== "All") {
      const [field, order] = sortBy.split("-");
      sort[field] = order === "desc" ? -1 : 1;
    }

    // Fetch products
    const products = await Product.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sort);

    const totalItems = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const updateProduct = async (req, res) => {
//   try {
//     const { name, buyPrice, sellPrice, stock, category } = req.body;
//     const images = req.files.length > 0 ? req.files.map(file => file.path) : undefined;

//     const updateData = { name, buyPrice, sellPrice, stock, category };
//     if (images) updateData.images = images;

//     const product = await productModel.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
//     res.status(200).json(product);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };



const deleteProduct = async (req, res) => {
  try {
    const product = await productModel.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// const getSingleProduct = async (req, res) => {
//   try {
//     const { productId } = req.params;

//     // Validate ObjectId format
//     if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({ message: 'Invalid product ID format' });
//     }

//     // Fetch the product by ID with populated category and createdBy
//     const product = await productModel.findById(productId)
//       .populate('category', 'name')
//       .populate('createdBy', 'name role');

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     // Fetch similar products (same category, exclude the current product)
//     const similarProducts = await productModel.find({
//       category: product?.category?._id,
//       _id: { $ne: productId },
//     })
//       .populate('category', 'name')
//       .populate('createdBy', 'name role')
//       .limit(4); // Limit to 4 similar products

//     res.status(200).json({
//       product,
//       similarProducts,
//     });
//   } catch (error) {
//     // Handle specific MongoDB CastError for invalid ObjectId
//     if (error.name === 'CastError') {
//       return res.status(400).json({ message: 'Invalid product ID format' });
//     }
//     res.status(500).json({ message: error.message });
//   }
// };

const getSingleProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // First fetch the product to determine the creator's role
    const rawProduct = await productModel.findById(productId)
      .populate('createdBy', 'name role');

    if (!rawProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get the role of the product's creator
    const productRole = rawProduct.createdBy.role;

    // Validate role
    if (!['wholesaler', 'retailer'].includes(productRole)) {
      return res.status(400).json({ message: 'Product creator role must be wholesaler or retailer' });
    }

    // Now fetch the product with proper population based on role
    let product;
    if (productRole === 'retailer') {
      product = await productModel.findById(productId)
        .populate({
          path: 'category',
          select: 'name image',
          model: 'RetailerCategory',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'subcategory',
          select: 'name',
          model: 'RetailerSubcategory', 
          options: { strictPopulate: false }
        })
        .populate({
          path: 'brand',
          select: 'name',
          options: { strictPopulate: false }
        })
        .populate('createdBy', 'name role');
    } else {
      // For wholesaler products, use regular Category/Subcategory models
      product = await productModel.findById(productId)
        .populate('category', 'name image')
        .populate('subcategory', 'name')
        .populate('brand', 'name')
        .populate('createdBy', 'name role');
    }

    // Find users with the same role as the main product's createdBy
    const users = await user.find({ role: productRole }).select('_id').lean();
    const userIds = users.map(user => user._id);

    // Define fields to select for similar products based on role
    const selectFields = productRole === 'wholesaler'
      ? 'name buyPrice stock category images createdBy'
      : 'name sellPrice stock category images createdBy';

    // Fetch similar products (same category, exclude current product, matching role)
    let similarProducts;
    if (product.category) {
      if (productRole === 'retailer') {
        similarProducts = await productModel.find({
          category: product.category._id,
          _id: { $ne: productId },
          createdBy: { $in: userIds }
        })
          .select(selectFields)
          .populate({
            path: 'category',
            select: 'name',
            model: 'RetailerCategory',
            options: { strictPopulate: false }
          })
          .populate('createdBy', 'name role')
          .limit(4)
          .lean();
      } else {
        similarProducts = await productModel.find({
          category: product.category._id,
          _id: { $ne: productId },
          createdBy: { $in: userIds }
        })
          .select(selectFields)
          .populate('category', 'name')
          .populate('createdBy', 'name role')
          .limit(4)
          .lean();
      }
    } else {
      similarProducts = [];
    }

    res.status(200).json({
      product,
      similarProducts
    });
  } catch (error) {
    // Handle specific MongoDB CastError for invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    console.error('Error in getSingleProduct:', error);
    res.status(500).json({ message: error.message });
  }
};



const filterProductsByUser = async (req, res) => {
  try {
    // Get query parameters
    const { role, category, minPrice, maxPrice, sortBy, page = 1, limit = 10 } = req.query;

    // Validate role
    if (!role || !["wholesaler", "retailer"].includes(role)) {
      return res.status(400).json({ success: false, message: "Please provide a valid role (wholesaler or retailer)" });
    }

    // Build query
    const query = { createdBy: { $in: (await user.find({ role }).select("_id").lean()).map(user => user._id) } };

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Add price filters if provided
    if (minPrice || maxPrice) {
      query[role === "wholesaler" ? "buyPrice" : "sellPrice"] = {};
      if (minPrice && !isNaN(minPrice) && Number(minPrice) >= 0) {
        query[role === "wholesaler" ? "buyPrice" : "sellPrice"].$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(maxPrice) && Number(maxPrice) >= 0) {
        query[role === "wholesaler" ? "buyPrice" : "sellPrice"].$lte = Number(maxPrice);
      }
    }

    // Define sort options
    let sort = {};
    if (sortBy === "createdAt-desc") sort.createdAt = -1;
    else if (sortBy === "createdAt-asc") sort.createdAt = 1;
    else if (sortBy === "purchaseCount-desc") sort.purchaseCount = -1;

    // Define fields to select based on role
    const selectFields = role === "wholesaler"
      ? "name buyPrice stock category images createdBy"
      : "name sellPrice stock category images createdBy";

    // Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute query
    const products = await productModel
      .find(query)
      .select(selectFields)
      .populate("category", "name")
      .populate("createdBy", "name role")
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count for pagination
    const total = await productModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalItems: total,
        itemsPerPage: limitNumber,
      },
    });
  } catch (error) {
    console.error("Error in filterProductsByUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




// Delete all wholesaler products
const deleteWholesalerProducts = async (req, res) => {
  try {
    // Find all users with 'wholesaler' role
    const wholesalers = await user.find({ role: 'wholesaler' }).select('_id');
    
    if (wholesalers.length === 0) {
      return res.status(200).json({ 
        message: 'No wholesaler users found',
        deletedCount: 0 
      });
    }

    // Extract wholesaler user IDs
    const wholesalerIds = wholesalers.map(wholesaler => wholesaler._id);

    // Find all products created by wholesaler users
    const wholesalerProducts = await productModel.find({ 
      createdBy: { $in: wholesalerIds } 
    }).populate('createdBy', 'role');

    // Double-check that we're only deleting products from wholesaler users
    const validWholesalerProducts = wholesalerProducts.filter(product => 
      product.createdBy && product.createdBy.role === 'wholesaler'
    );

    if (validWholesalerProducts.length === 0) {
      return res.status(200).json({ 
        message: 'No products found for wholesaler users',
        deletedCount: 0 
      });
    }

    // Delete only the validated wholesaler products
    const validProductIds = validWholesalerProducts.map(product => product._id);
    const result = await productModel.deleteMany({ 
      _id: { $in: validProductIds } 
    });

    res.status(200).json({ 
      message: `Successfully deleted ${result.deletedCount} wholesaler products`,
      deletedCount: result.deletedCount,
      wholesalerCount: wholesalers.length
    });

  } catch (error) {
    console.error('Error deleting wholesaler products:', error);
    res.status(500).json({ 
      message: 'Failed to delete wholesaler products',
      error: error.message 
    });
  }
};

// CSV Bulk Upload Products for Retailers
const bulkUploadCSVRetailer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              processedCount++;
              
              // Extract and validate required fields
              const {
                item_number,
                lookup_code,
                sku,
                brand: brandName,
                name,
                description,
                bin_location,
                buyPrice,
                stock,
                sellPrice,
                category: categoryName,
                subcategory: subcategoryName,
                images,
                length,
                width,
                height,
                weight,
                additional,
                ingredient,
                disclaimer,
                supplierName
              } = row;

              // Validate required fields (category only)
              if (!categoryName) {
                errors.push({
                  row: processedCount,
                  product: name || 'Unknown',
                  message: 'Missing required field: category'
                });
                continue;
              }

              // Parse numeric fields
              const parsedBuyPrice = parseFloat(buyPrice);
              const parsedSellPrice = parseFloat(sellPrice);
              const parsedStock = parseInt(stock);
              const parsedLength = length ? parseFloat(length) : undefined;
              const parsedWidth = width ? parseFloat(width) : undefined;
              const parsedHeight = height ? parseFloat(height) : undefined;
              const parsedWeight = weight ? parseFloat(weight) : undefined;

              if (isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid buyPrice: must be a positive number'
                });
                continue;
              }

              if (isNaN(parsedSellPrice) || parsedSellPrice < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid sellPrice: must be a positive number'
                });
                continue;
              }

              if (isNaN(parsedStock) || parsedStock < 0) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: 'Invalid stock: must be a non-negative integer'
                });
                continue;
              }

              // Find retailer category by name
              const category = await retailerCategoryModel.findOne({ name: categoryName.trim() });
              if (!category) {
                errors.push({
                  row: processedCount,
                  product: name,
                  message: `Retailer category '${categoryName}' not found`
                });
                continue;
              }

              // Find retailer subcategory by name (optional)
              let subcategory = null;
              if (subcategoryName && subcategoryName.trim()) {
                subcategory = await retailerSubcategoryModel.findOne({ name: subcategoryName.trim() });
                if (!subcategory) {
                  errors.push({
                    row: processedCount,
                    product: name,
                    message: `Retailer subcategory '${subcategoryName}' not found - creating product without subcategory`
                  });
                }
              }

              // Find brand by name (optional)
              let brand = null;
              if (brandName && brandName.trim()) {
                brand = await brandModel.findOne({ name: brandName.trim() });
                // Brand is optional, no need to log error if not found
              }

              // Process images (split by comma if multiple URLs)
              const imageArray = images && images.trim() ? 
                images.split(',').map(img => img.trim()).filter(img => img) : [];

              // Create product
              const productData = {
                item_number: item_number || undefined,
                lookup_code: lookup_code || undefined,
                name: name.trim(),
                sku: sku || undefined,
                buyPrice: parsedBuyPrice,
                sellPrice: parsedSellPrice,
                stock: parsedStock,
                category: category._id,
                subcategory: subcategory ? subcategory._id : undefined,
                brand: brand ? brand._id : undefined,
                images: imageArray,
                description: description || undefined,
                additional: additional || undefined,
                ingredient: ingredient || undefined,
                disclaimer: disclaimer || undefined,
                bin_location: bin_location || undefined,
                length: parsedLength,
                width: parsedWidth,
                height: parsedHeight,
                weight: parsedWeight,
                supplierName: supplierName || undefined,
                createdBy: req.user._id
              };

              // Remove undefined fields
              Object.keys(productData).forEach(key => {
                if (productData[key] === undefined) {
                  delete productData[key];
                }
              });

              const product = await productModel.create(productData);
              
            } catch (error) {
              errors.push({
                row: processedCount,
                product: row.name || 'Unknown',
                message: error.message
              });
            }
          }

          // Delete uploaded file
          fs.unlinkSync(req.file.path);

          const successCount = processedCount - errors.length;
          
          res.status(201).json({
            message: `CSV upload completed: ${successCount} products created, ${errors.length} errors`,
            totalProcessed: processedCount,
            successCount,
            errorCount: errors.length,
            errors: errors.slice(0, 10) // Return first 10 errors to avoid large response
          });

        } catch (error) {
          // Delete uploaded file in case of error
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          res.status(500).json({
            message: 'Error processing CSV file',
            error: error.message
          });
        }
      })
      .on('error', (error) => {
        // Delete uploaded file in case of error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
          message: 'Error reading CSV file',
          error: error.message
        });
      });

  } catch (error) {
    console.error('CSV upload failed:', error);
    res.status(500).json({ message: error.message });
  }
};

// Retailer-specific filter products function
const filterRetailerProducts = async (req, res) => {
  try {
    const {
      category: categoryIds,
      subcategory: subcategoryIds,
      brand: brandIds,
      minPrice,
      maxPrice,
      sortBy,
      search,
      page = 1,
      limit = 12
    } = req.query;

    console.log('Retailer filter query params:', req.query);

    // Build the filter query
    let query = {};

    // Only show products created by retailers
    const retailers = await user.find({ role: 'retailer' }).select('_id');
    const retailerIds = retailers.map(retailer => retailer._id);
    query.createdBy = { $in: retailerIds };

    // Search functionality - search in product name and description
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ];
    }

    // Filter by retailer categories
    if (categoryIds) {
      const categoryArray = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      
      // Validate that these are valid retailer category IDs
      const validCategories = await retailerCategoryModel.find({ 
        _id: { $in: categoryArray } 
      }).select('_id');
      
      if (validCategories.length > 0) {
        query.category = { $in: validCategories.map(cat => cat._id) };
      }
    }

    // Filter by retailer subcategories
    if (subcategoryIds) {
      const subcategoryArray = Array.isArray(subcategoryIds) ? subcategoryIds : [subcategoryIds];
      
      // Validate that these are valid retailer subcategory IDs
      const validSubcategories = await retailerSubcategoryModel.find({ 
        _id: { $in: subcategoryArray } 
      }).select('_id');
      
      if (validSubcategories.length > 0) {
        query.subcategory = { $in: validSubcategories.map(sub => sub._id) };
      }
    }

    // Filter by brands
    if (brandIds) {
      const brandArray = Array.isArray(brandIds) ? brandIds : [brandIds];
      query.brand = { $in: brandArray };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.sellPrice = {};
      if (minPrice) query.sellPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.sellPrice.$lte = parseFloat(maxPrice);
    }

    console.log('Final retailer filter query:', JSON.stringify(query, null, 2));

    // Set up sorting
    let sortQuery = {};
    switch (sortBy) {
      case 'price-low-high':
        sortQuery = { sellPrice: 1 };
        break;
      case 'price-high-low':
        sortQuery = { sellPrice: -1 };
        break;
      case 'name-a-z':
        sortQuery = { name: 1 };
        break;
      case 'name-z-a':
        sortQuery = { name: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch filtered products with retailer-specific population
    const products = await productModel
      .find(query)
      .populate({
        path: 'category',
        select: 'name image',
        model: 'RetailerCategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'subcategory',
        select: 'name',
        model: 'RetailerSubcategory',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'brand',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate('createdBy', 'name role')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalProducts = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    console.log(`Found ${products.length} retailer products out of ${totalProducts} total`);

    res.status(200).json({
      success: true,
      products,
      currentPage: pageNum,
      totalPages,
      totalProducts,
      hasMore: pageNum < totalPages
    });

  } catch (error) {
    console.error('Error filtering retailer products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while filtering products',
      error: error.message
    });
  }
};

// Search wholesaler products
const searchWholesalerProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 8 } = req.query;

    if (!search || !search.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Get wholesaler user IDs
    const wholesalers = await user.find({ role: 'wholesaler' }).select('_id');
    const wholesalerIds = wholesalers.map(user => user._id);

    const searchTerm = search.trim();
    
    // Create more accurate search with word boundaries and exact matches
    const exactMatch = new RegExp(`^${searchTerm}$`, 'i');
    const startsWithMatch = new RegExp(`^${searchTerm}`, 'i');
    const containsMatch = new RegExp(searchTerm, 'i');

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // First, get all matching products without pagination for accurate sorting
    const allProducts = await productModel
      .find({
        createdBy: { $in: wholesalerIds },
        $or: [
          { name: { $regex: containsMatch } },
          { sku: { $regex: containsMatch } },
          { description: { $regex: containsMatch } },
          { item_number: { $regex: containsMatch } },
          { lookup_code: { $regex: containsMatch } }
        ]
      })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'name')
      .populate('createdBy', 'name role')
      .lean();

    // Sort products by relevance: exact match > starts with > contains, then alphabetically by name
    const sortedProducts = allProducts.sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      const aSku = a.sku || '';
      const bSku = b.sku || '';
      
      // Check exact matches first
      const aExactName = exactMatch.test(aName);
      const bExactName = exactMatch.test(bName);
      const aExactSku = exactMatch.test(aSku);
      const bExactSku = exactMatch.test(bSku);
      
      if ((aExactName || aExactSku) && !(bExactName || bExactSku)) return -1;
      if (!(aExactName || aExactSku) && (bExactName || bExactSku)) return 1;
      
      // Check starts with matches
      const aStartsName = startsWithMatch.test(aName);
      const bStartsName = startsWithMatch.test(bName);
      const aStartsSku = startsWithMatch.test(aSku);
      const bStartsSku = startsWithMatch.test(bSku);
      
      if ((aStartsName || aStartsSku) && !(bStartsName || bStartsSku)) return -1;
      if (!(aStartsName || aStartsSku) && (bStartsName || bStartsSku)) return 1;
      
      // Finally sort alphabetically by name
      return aName.localeCompare(bName);
    });

    // Apply pagination to sorted results
    const paginatedProducts = sortedProducts.slice(skip, skip + limitNum);
    const totalProducts = sortedProducts.length;
    const totalPages = Math.ceil(totalProducts / limitNum);

    res.status(200).json({
      products: paginatedProducts,
      currentPage: pageNum,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.error('Error searching wholesaler products:', error);
    res.status(500).json({ message: error.message });
  }
};

// Filter products for frontend
const filterProducts = async (req, res) => {
  try {
    const {
      role = 'wholesaler',
      category: rawCategoryIds,
      subcategory: rawSubcategoryIds,
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 7
    } = req.query;

    // Clean up category and subcategory arrays
    const cleanIds = (ids) => {
      if (!ids) return [];
      if (Array.isArray(ids)) {
        return ids.flatMap(id => id.split(',')).filter(id => id && id.trim() !== '').map(id => id.trim());
      }
      return ids.split(',').filter(id => id && id.trim() !== '').map(id => id.trim());
    };
    
    const categoryIds = cleanIds(rawCategoryIds);
    const subcategoryIds = cleanIds(rawSubcategoryIds);

    // Get wholesaler user IDs
    const wholesalers = await user.find({ role: 'wholesaler' }).select('_id');
    const wholesalerIds = wholesalers.map(user => user._id);

    // Build query
    const query = {
      createdBy: { $in: wholesalerIds }
    };

    // Filter by categories
    if (categoryIds.length > 0) {
      query.category = { $in: categoryIds };
    }

    // Filter by subcategories
    if (subcategoryIds.length > 0) {
      query.subcategory = { $in: subcategoryIds };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.buyPrice = {};
      if (minPrice) query.buyPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.buyPrice.$lte = parseFloat(maxPrice);
    }

    // Set up sorting
    let sortQuery = {};
    if (sortBy && sortBy !== 'All') {
      const [field, order] = sortBy.split('-');
      if (field === 'buyPrice' || field === 'createdAt') {
        sortQuery[field] = order === 'desc' ? -1 : 1;
      }
    } else {
      sortQuery = { createdAt: -1 };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch products
    const products = await productModel
      .find(query)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'name')
      .populate('createdBy', 'name role')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const totalProducts = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    res.status(200).json({
      products,
      currentPage: pageNum,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get product counts by category and subcategory
const getProductCount = async (req, res) => {
  try {
    // Get wholesaler user IDs
    const wholesalers = await user.find({ role: 'wholesaler' }).select('_id');
    const wholesalerIds = wholesalers.map(user => user._id);

    // Get all categories with their product counts
    const categoryPipeline = [
      {
        $match: {
          createdBy: { $in: wholesalerIds }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ];

    const categoryResults = await productModel.aggregate(categoryPipeline);
    const categoryCounts = {};
    categoryResults.forEach(result => {
      if (result._id) {
        categoryCounts[result._id.toString()] = result.count;
      }
    });

    // Get all subcategories with their product counts
    const subcategoryPipeline = [
      {
        $match: {
          createdBy: { $in: wholesalerIds },
          subcategory: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$subcategory',
          count: { $sum: 1 }
        }
      }
    ];

    const subcategoryResults = await productModel.aggregate(subcategoryPipeline);
    const subcategoryCounts = {};
    subcategoryResults.forEach(result => {
      if (result._id) {
        subcategoryCounts[result._id.toString()] = result.count;
      }
    });

    res.status(200).json({
      success: true,
      categoryCounts,
      subcategoryCounts
    });
  } catch (error) {
    console.error('Error getting product counts:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get inventory analytics for retailer
const getRetailerInventoryAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get products by category
    const categoryStats = await productModel.aggregate([
      { $match: { createdBy: userId, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' }
        }
      },
      {
        $lookup: {
          from: 'retailercategories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          totalProducts: 1,
          totalStock: 1
        }
      }
    ]);

    // Get low stock products (stock <= 2)
    const lowStockProducts = await productModel.aggregate([
      { $match: { createdBy: userId, stock: { $lte: 2 } } },
      {
        $lookup: {
          from: 'retailercategories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          stock: 1,
          categoryName: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] }
        }
      }
    ]);

    // Get low stock products grouped by category
    const lowStockByCategory = await productModel.aggregate([
      { $match: { createdBy: userId, stock: { $lte: 2 }, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          lowStockCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'retailercategories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          lowStockCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      categoryStats,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      lowStockByCategory
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get inventory analytics for wholesaler
const getWholesalerInventoryAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get products by category
    const categoryStats = await productModel.aggregate([
      { $match: { createdBy: userId, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$stock', 10] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          totalProducts: 1,
          totalStock: 1,
          lowStockCount: 1,
          normalStockCount: { $subtract: ['$totalProducts', '$lowStockCount'] }
        }
      }
    ]);

    // Get low stock products (stock <= 10)
    const lowStockProducts = await productModel.aggregate([
      { $match: { createdBy: userId, stock: { $lte: 10 } } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          stock: 1,
          categoryName: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] }
        }
      }
    ]);

    // Get low stock products grouped by category
    const lowStockByCategory = await productModel.aggregate([
      { $match: { createdBy: userId, stock: { $lte: 10 }, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          lowStockCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          lowStockCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      categoryStats,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      lowStockByCategory
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getAddedProducts,
  updateProduct,
  deleteProduct, getProductsByWholesalerRetailor, getSingleProduct, filterProductsByUser, bulkCreateProducts, getProductss, getRetailerProducts,getWholesalerProducts,getRetailerProductsByCategory,getWholesalerProductsByCategory,getProductsByRetailer,
  deleteWholesalerProducts,
  bulkUploadCSV,
  bulkUploadCSVRetailer,
  filterRetailerProducts,
  searchWholesalerProducts,
  filterProducts,
  getProductCount,
  getRetailerInventoryAnalytics,
  getWholesalerInventoryAnalytics
};


