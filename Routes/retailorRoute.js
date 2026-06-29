const express = require('express');
const { createProduct, getAddedProducts, updateProduct, deleteProduct, getProductsByWholesalerRetailor, getRetailerProducts,getRetailerProductsByCategory, getProductsByRetailer, getSingleProduct, bulkUploadCSVRetailer, filterRetailerProducts, getRetailerInventoryAnalytics } = require('../Controllers/productController');
const { uploadProduct, uploadCategory, uploadCSV, uploadBlog } = require('../multerConfig/multerConfig');
const { createCategory, getCategories, updateCategory, deleteCategory, getRetailerPurchases, createBrand, getBrands, updateBrand, deleteBrand, getRetailerCategories, createBlog, getBlogs, getAllBlogs, updateBlog, deleteBlog } = require('../Controllers/categoryController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { getRetailerProductsWithReviews, getRetailerProductReviews } = require('../Controllers/retailerReviewController');
const retailorRouter= express.Router();


retailorRouter.post('/create-product',protect, restrictTo('retailer'), uploadProduct.array('images',10),createProduct); // Admin/Wholesaler/Retailer login

retailorRouter.get('/get-products',protect, restrictTo('retailer'),getProductsByRetailer); // Admin/Wholesaler/Retailer loginw

retailorRouter.get('/inventory-analytics', protect, restrictTo('retailer'), getRetailerInventoryAnalytics); // Get inventory analytics

retailorRouter.get('/get-product/:productId', protect, restrictTo('retailer'), getSingleProduct); // Get single product for editing

//retailer tirtho
retailorRouter.get('/get-tirtho-retailer',getRetailerProducts); // Get all products added by the retailer
retailorRouter.get('/get-tirtho-retailer-category', getRetailerProductsByCategory); // Get all products added by the wholesaler

retailorRouter.put('/update-products/:id',protect, restrictTo('retailer'),uploadProduct.array('images',10),updateProduct); // Admin/Wholesaler/Retailer login

retailorRouter.delete('/delete-product/:id', protect, restrictTo('retailer'), deleteProduct);

// CSV bulk upload route for retailers
retailorRouter.post('/bulk-upload-csv', protect, restrictTo('retailer'), uploadCSV.single('csvFile'), bulkUploadCSVRetailer);

// Filter products route for retailers
retailorRouter.get('/filter-products', filterRetailerProducts);


retailorRouter.post('/create-category',protect, restrictTo('retailer'), uploadCategory.single('image'),createCategory);

retailorRouter.get('/get-category',protect, restrictTo('retailer'),getRetailerCategories);

retailorRouter.put('/update-category/:id', protect, restrictTo('retailer'), uploadCategory.single('image'), updateCategory);

retailorRouter.delete('/delete-category/:id', protect, restrictTo('retailer'), deleteCategory);

retailorRouter.get('/get-orders', protect, restrictTo('retailer'),getRetailerPurchases); // Get all purchases made by the retailer



retailorRouter.post('/create-brand', protect,restrictTo('retailer'), createBrand);
retailorRouter.get('/get-brands', protect,restrictTo('retailer'), getBrands);
retailorRouter.put('/update-brand/:id', protect,restrictTo('retailer'), updateBrand);
retailorRouter.delete('/delete-brand/:id', protect,restrictTo('retailer'), deleteBrand);

// Retailer-specific filter products endpoint
retailorRouter.get('/filter-products', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 6
    } = req.query;

    const query = {};

    // Filter by retailer categories
    if (category && category.length > 0) {
      const categories = Array.isArray(category) ? category : [category];
      const validCategories = [];
      for (const catId of categories) {
        if (!mongoose.isValidObjectId(catId)) {
          console.log('Invalid retailer category ID:', catId);
          continue;
        }
        const categoryExists = await mongoose.model('RetailerCategory').findById(catId).lean();
        if (categoryExists) {
          validCategories.push(new mongoose.Types.ObjectId(catId));
        }
      }
      if (validCategories.length > 0) {
        query.retailerCategory = { $in: validCategories };
      }
    }

    // Filter by retailer subcategories
    if (subcategory && subcategory.length > 0) {
      const subcategories = Array.isArray(subcategory) ? subcategory : [subcategory];
      const validSubcategories = [];
      for (const subId of subcategories) {
        if (!mongoose.isValidObjectId(subId)) {
          console.log('Invalid retailer subcategory ID:', subId);
          continue;
        }
        const subcategoryExists = await mongoose.model('RetailerSubcategory').findById(subId).lean();
        if (subcategoryExists) {
          validSubcategories.push(new mongoose.Types.ObjectId(subId));
        }
      }
      if (validSubcategories.length > 0) {
        query.retailerSubcategory = { $in: validSubcategories };
      }
    }

    // Filter by brands
    if (brand && brand.length > 0) {
      const brands = Array.isArray(brand) ? brand : [brand];
      const validBrands = [];
      for (const brandId of brands) {
        if (!mongoose.isValidObjectId(brandId)) {
          console.log('Invalid brand ID:', brandId);
          continue;
        }
        const brandExists = await mongoose.model('Brand').findById(brandId).lean();
        if (brandExists) {
          validBrands.push(new mongoose.Types.ObjectId(brandId));
        }
      }
      if (validBrands.length > 0) {
        query.brand = { $in: validBrands };
      }
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.buyPrice = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        query.buyPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        query.buyPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Validate price range
    if (query.buyPrice && query.buyPrice.$gte && query.buyPrice.$lte) {
      if (query.buyPrice.$gte > query.buyPrice.$lte) {
        return res.status(400).json({ message: 'Minimum price cannot be greater than maximum price' });
      }
    }

    // Filter by retailer role only
    const retailers = await mongoose.model('User').find({ role: 'retailer' }).distinct('_id');
    if (retailers.length === 0) {
      return res.status(400).json({ message: 'No retailers found' });
    }
    query.createdBy = { $in: retailers };

    // Build sort object
    let sort = {};
    if (sortBy && sortBy !== 'All') {
      const [field, order] = sortBy.split('-');
      sort[field] = order === 'asc' ? 1 : -1;
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const skip = (pageNum - 1) * limitNum;

    // Fetch products with population
    const products = await mongoose.model('Product')
      .find(query)
      .populate('retailerCategory', 'name image')
      .populate('retailerSubcategory', 'name')
      .populate('brand', 'name')
      .populate('createdBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalProducts = await mongoose.model('Product').countDocuments(query);

    // Prepare response
    const response = {
      success: true,
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
      totalProducts
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in retailer filter-products:', error);
    res.status(500).json({ success: false, message: `Server error while fetching retailer products: ${error.message}` });
  }
});

// Retailer review routes
retailorRouter.get('/products-with-reviews', protect, restrictTo('retailer'), getRetailerProductsWithReviews);
retailorRouter.get('/product-reviews/:productId', protect, restrictTo('retailer'), getRetailerProductReviews);

// Retailer blog routes
retailorRouter.post('/create-blog', protect, restrictTo('retailer'), uploadBlog.array('images', 10), createBlog);
retailorRouter.get('/get-blogs', protect, restrictTo('retailer'), getBlogs);
retailorRouter.get('/get-all-blogs', (req, res, next) => {
  req.query.role = 'retailer';
  next();
}, getAllBlogs); // Public endpoint for retailer website
retailorRouter.put('/update-blog/:id', protect, restrictTo('retailer'), uploadBlog.array('images', 10), updateBlog);
retailorRouter.delete('/delete-blog/:id', protect, restrictTo('retailer'), deleteBlog);

// Newsletter routes
const { createNewsletter, getAllNewsletters, deleteNewsletter } = require('../Controllers/newsletterController');
retailorRouter.post('/newsletter', createNewsletter);
retailorRouter.get('/newsletters', protect, restrictTo('retailer'), getAllNewsletters);
retailorRouter.delete('/newsletter/:id', protect, restrictTo('retailer'), deleteNewsletter);

module.exports = retailorRouter;