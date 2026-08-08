const express = require('express');
const { createProduct, getAddedProducts, updateProduct, deleteProduct, deleteWholesalerProducts, adjustInventory } = require('../Controllers/productController');
const { uploadProduct, uploadCategory } = require('../multerConfig/multerConfig');
const { createCategory, getCategories, updateCategory, deleteCategory, createRetailerCategory, getRetailerCategories, updateRetailerCategory, deleteRetailerCategory, createBrand, getBrands, updateBrand, deleteBrand , getDepartmentsWithCategories } = require('../Controllers/categoryController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { getProductsWithReviews, getProductReviews } = require('../Controllers/adminReviewController');
const { getInvoiceSettings, updateInvoiceSettings } = require('../Controllers/invoiceSettingsController');
const { getAdminNewsletters, deleteAdminNewsletter, editAdminNewsletter, setDoNotEmail } = require('../Controllers/newsletterController');
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
adminRouter.patch('/newsletter/:id/do-not-email', protect, restrictTo('admin'), setDoNotEmail);
adminRouter.patch('/newsletter/:id/do-not-email', protect, restrictTo('admin'), setDoNotEmail);


adminRouter.patch('/inventory/:id', protect, restrictTo('admin'), adjustInventory);

// Departments tree for admin
adminRouter.get('/departments', protect, restrictTo('admin'), getDepartmentsWithCategories);

// Idempotent category seed — POST /api/admin/seed-categories
adminRouter.post('/seed-categories', protect, restrictTo('admin'), async (req, res) => {
  try {
    const Category = require('../Models/categoryModel');
    const DEPARTMENTS = {
      'AROMA THERAPY': ['CARRIER OIL','ESSENTIAL OILS'],
      'BLOOD SUGAR SUPPORT': ['INSULIN SUPPORT'],
      'BODY OIL': ['CARRIER OIL'],
      'CARDIOVASCULAR SUPPORT': ['CHOLESTEROL','CIRCULARTORY SUPPORT','GINSENG ENERGRY','HEART SUPPORT'],
      "CHILDREN'S HEALTH": ['CHILDRENS VITAMINS','KIDE ANXIETY'],
      'DIGESTION - DETOX': ['CLEANSING - COLON SUPPORT','DETOX','DETOX - LIVER CLENSES','DIGESTIVE AID - ENZYMES','INTESTINAL SUPPORT','KIDNNEY - URINARY - LYMPH SUPP','YEAST - BACTERIA - FUNGAL DETO'],
      'HERBAL SUPPLEMENTS A - Z': ['BRAIN AND NERVE SUPPORT','HERBAL SUPPLEMENT','LIQUID HERBS'],
      'HORMONAL HEALTH': ['WOMENS HEALTH'],
      'HYGIENE': ['MOUTHWASH','SANITIZER'],
      'IMMUNE SYSTEM SUPPORT': ['BLACK SEED','IMMUNE ANTIOXIDANT SUPPORT','IMMUNE SUPPORT','MUSHROOM','RESPIRATORY HERBS/BRONCHIAL SU','SINUS SUPPORT -   ALLERGIES SU'],
      'JOINT SUPPORT': ['INFLAMMATION','JOINT AND ARTHRITIS','JOINT HEALTH','PAIN MANAGMENT'],
      'LIQUID HERBS A - Z': ['LIQUID SUPPLEMENT'],
      'MEN -  WOMAN HEALTH': ['ADRENAL SUPPORT','GLANDULAR SUPPORT','HORMONAL HEALTH',"MEN & WOMEN hEALTH",'MEN AND WOMEN GLANDULAR SUPPOR',"MEN'S HEALTH",'THYROID SUPPORT','WEIGHT MANAGEMENT','WOMEN HEALTH'],
      'MINERALS': ['IRON','ZINC'],
      'NERVOUS SYSTEM': ['ALCOHOLISM','ANXIETY SUPPORT','BRAIN -  NERVE SUPPORT -  MENT','EYE CARE','HEAD - AID','SLEEP','STRESS ANXIETY SUPPORT','STRESS SUPPORT'],
      'PANTRY': ['IRISH SEA MOSS','SWEETENER'],
      'PERSONAL SUPPORT': ['EAR','FIRST AID','HAIR','HAIR - SKIN - NAILS','SKIN'],
      'SUPERFOOD': ['CAPSULES','JUICE','LOOSE HERBS','SEA MOSS'],
      'VITAMINS A - Z': ['B VITAMINS','C VITAMINS','D VITAMINS','VITAMIN A-Z'],
    };
    const adminUser = req.user;
    let created = 0, updated = 0, skipped = 0;
    for (const [dept, names] of Object.entries(DEPARTMENTS)) {
      for (const catName of names) {
        const trimmed = catName.trim();
        let cat = await Category.findOne({ name: trimmed });
        if (!cat) {
          await Category.create({ name: trimmed, department: dept, createdBy: adminUser._id, subcategories: [] });
          created++;
        } else if (!cat.department) {
          cat.department = dept; await cat.save(); updated++;
        } else { skipped++; }
      }
    }
    res.status(200).json({ success: true, message: 'Seed complete', created, updated, skipped });
  } catch (error) {
    console.error('[seed-categories]', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = adminRouter;