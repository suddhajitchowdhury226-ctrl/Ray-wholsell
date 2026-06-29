const express = require('express');
const { createProduct, getAddedProducts, updateProduct, deleteProduct, getProductsByWholesalerRetailor, bulkCreateProducts,getWholesalerProducts,getWholesalerProductsByCategory, bulkUploadCSV, searchWholesalerProducts, getWholesalerInventoryAnalytics } = require('../Controllers/productController');
const { uploadProduct, uploadCategory, uploadBlog, uploadCSV } = require('../multerConfig/multerConfig');
const { createCategory, getCategories, updateCategory, deleteCategory, getRetailerPurchases, createBrand, getBrands, updateBrand, deleteBrand, createBlog, getBlogs, getAllBlogs, updateBlog, deleteBlog } = require('../Controllers/categoryController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { getWholesalerProductsWithReviews, getWholesalerProductReviews } = require('../Controllers/wholesalerReviewController');
const { createNewsletter, getAllNewsletters, deleteNewsletter } = require('../Controllers/newsletterController');
const wholesalerRouter = express.Router();


wholesalerRouter.post('/create-product',protect, restrictTo('wholesaler'), uploadProduct.array('images',10),createProduct); // Admin/Wholesaler/Retailer login

wholesalerRouter.get('/get-products',protect, restrictTo('wholesaler'),getProductsByWholesalerRetailor); // Admin/Wholesaler/Retailer login

//tirtho wholesaler
wholesalerRouter.get('/get-tirtho-wholesaler',getWholesalerProducts); // Get all products added by the wholesaler
wholesalerRouter.get('/get-tirtho-wholesaler-category', getWholesalerProductsByCategory); // Get all products added by the wholesaler
wholesalerRouter.get('/search-products', searchWholesalerProducts); // Search wholesaler products


wholesalerRouter.put('/update-products/:id',protect, restrictTo('wholesaler'),uploadProduct.array('images',10),updateProduct); // Admin/Wholesaler/Retailer login


wholesalerRouter.delete('/delete-product/:id', protect, restrictTo('wholesaler'), deleteProduct);

// CSV bulk upload route
wholesalerRouter.post('/bulk-upload-csv', protect, restrictTo('wholesaler'), uploadCSV.single('csvFile'), bulkUploadCSV);

wholesalerRouter.post('/create-category',protect, restrictTo('wholesaler'), uploadCategory.single('image'),createCategory);

wholesalerRouter.get('/get-category',protect, restrictTo('wholesaler'),getCategories);

wholesalerRouter.put('/update-category/:id', protect, restrictTo('wholesaler'), uploadCategory.single('image'), updateCategory);

wholesalerRouter.delete('/delete-category/:id', protect, restrictTo('wholesaler'), deleteCategory);


wholesalerRouter.post('/bulk-create-products', protect, restrictTo('wholesaler'), bulkCreateProducts); 

wholesalerRouter.get('/get-orders', protect, restrictTo('wholesaler'),getRetailerPurchases) // Get all purchases made by the retailer




wholesalerRouter.post('/create-brand', protect,restrictTo('wholesaler'), createBrand);
wholesalerRouter.get('/get-brands', protect,restrictTo('wholesaler'), getBrands);
wholesalerRouter.put('/update-brand/:id', protect,restrictTo('wholesaler'), updateBrand);
wholesalerRouter.delete('/delete-brand/:id', protect,restrictTo('wholesaler'), deleteBrand)



wholesalerRouter.post('/create-blog', protect, restrictTo('wholesaler'), uploadBlog.array('images', 10), createBlog);
wholesalerRouter.get('/get-blogs', protect, restrictTo('wholesaler'), getBlogs);
wholesalerRouter.get('/get-all-blogs', (req, res, next) => {
  req.query.role = 'wholesaler';
  next();
}, getAllBlogs); // Public endpoint for wholesaler website
wholesalerRouter.put('/update-blog/:id', protect, restrictTo('wholesaler'), uploadBlog.array('images', 10), updateBlog);
wholesalerRouter.delete('/delete-blog/:id', protect, restrictTo('wholesaler'), deleteBlog);

// Wholesaler review routes
wholesalerRouter.get('/products-with-reviews', protect, restrictTo('wholesaler'), getWholesalerProductsWithReviews);
wholesalerRouter.get('/product-reviews/:productId', protect, restrictTo('wholesaler'), getWholesalerProductReviews);

// Wholesaler inventory analytics
wholesalerRouter.get('/inventory-analytics', protect, restrictTo('wholesaler'), getWholesalerInventoryAnalytics);

// Newsletter routes
wholesalerRouter.post('/newsletter', createNewsletter);
wholesalerRouter.get('/newsletters', protect, restrictTo('wholesaler'), getAllNewsletters);
wholesalerRouter.delete('/newsletter/:id', protect, restrictTo('wholesaler'), deleteNewsletter);

module.exports = wholesalerRouter;