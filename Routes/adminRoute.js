const express = require('express');
const { createProduct, getAddedProducts, updateProduct, deleteProduct, deleteWholesalerProducts } = require('../Controllers/productController');
const { uploadProduct, uploadCategory } = require('../multerConfig/multerConfig');
const { createCategory, getCategories, updateCategory, deleteCategory, createRetailerCategory, getRetailerCategories, updateRetailerCategory, deleteRetailerCategory, createBrand, getBrands, updateBrand, deleteBrand } = require('../Controllers/categoryController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { getProductsWithReviews, getProductReviews } = require('../Controllers/adminReviewController');
const { getInvoiceSettings, updateInvoiceSettings } = require('../Controllers/invoiceSettingsController');
const { getAdminNewsletters, deleteAdminNewsletter, editAdminNewsletter } = require('../Controllers/newsletterController');
const adminRouter = express.Router();


adminRouter.post('/create-product', protect, restrictTo('admin'), uploadProduct.array('images', 10), createProduct); // Admin/Wholesaler/Retailer login

adminRouter.get('/get-products', protect, restrictTo('admin'), getAddedProducts); // Admin/Wholesaler/Retailer login

adminRouter.put('/update-products/:id', protect, restrictTo('admin'), uploadProduct.array('images', 10), updateProduct); // Admin/Wholesaler/Retailer login

adminRouter.delete('/delete-product/:id', protect, restrictTo('admin'), deleteProduct);

// Wholesaler Categories (existing)
adminRouter.post('/create-category', protect, restrictTo('admin'), uploadCategory.single('image'), createCategory);

adminRouter.get('/get-category', protect, restrictTo('admin'), getCategories);

adminRouter.put('/update-category/:id', protect, restrictTo('admin'), uploadCategory.single('image'), updateCategory);

adminRouter.delete('/delete-category/:id', protect, restrictTo('admin'), deleteCategory);

// Retailer Categories (new)
adminRouter.post('/create-retailer-category', protect, restrictTo('admin'), uploadCategory.single('image'), createRetailerCategory);

adminRouter.get('/get-retailer-category', protect, restrictTo('admin'), getRetailerCategories);

adminRouter.put('/update-retailer-category/:id', protect, restrictTo('admin'), uploadCategory.single('image'), updateRetailerCategory);

adminRouter.delete('/delete-retailer-category/:id', protect, restrictTo('admin'), deleteRetailerCategory);


adminRouter.post('/create-brand', protect, restrictTo('admin'), createBrand);
adminRouter.get('/get-brands', protect, restrictTo('admin'), getBrands);
adminRouter.put('/update-brand/:id', protect, restrictTo('admin'), updateBrand);
adminRouter.delete('/delete-brand/:id', protect, restrictTo('admin'), deleteBrand)

// Delete all wholesaler products — BULK DELETE: highest priority, admin only
adminRouter.delete('/delete-wholesaler-products', protect, restrictTo('admin'), deleteWholesalerProducts);

// Admin review routes
adminRouter.get('/products-with-reviews', protect, restrictTo('admin'), getProductsWithReviews);
adminRouter.get('/product-reviews/:productId', protect, restrictTo('admin'), getProductReviews);

// Invoice settings routes
adminRouter.get('/invoice-settings', protect, getInvoiceSettings);
adminRouter.put('/invoice-settings', protect, restrictTo('admin'), updateInvoiceSettings);

// Newsletter routes
adminRouter.get('/newsletters', protect, restrictTo('admin'), getAdminNewsletters);
adminRouter.delete('/newsletter/:id', protect, restrictTo('admin'), deleteAdminNewsletter);
adminRouter.put('/newsletter/:id', protect, restrictTo('admin'), editAdminNewsletter);

module.exports = adminRouter;