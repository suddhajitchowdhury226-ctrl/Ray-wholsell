const express = require('express');
const { createProduct, getAddedProducts, updateProduct, deleteProduct, deleteWholesalerProducts, adjustInventory } = require('../Controllers/productController');
const { uploadProduct, uploadCategory } = require('../multerConfig/multerConfig');
const { createCategory, getCategories, updateCategory, deleteCategory, createRetailerCategory, getRetailerCategories, updateRetailerCategory, deleteRetailerCategory, createBrand, getBrands, updateBrand, deleteBrand , getDepartmentsWithCategories } = require('../Controllers/categoryController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { uploadBlog } = require('../multerConfig/multerConfig');
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

// Admin blog management — admin can manage all retailer blogs
adminRouter.post('/create-blog', protect, restrictTo('admin'), uploadBlog.array('images', 10), async (req, res) => {
  try {
    const Blog = require('../Models/blogSchema');
    const { title, content, subtitle, excerpt, category, categorySlug,
            authorDisplayName, authorBrandLine, readTime, tags, published,
            featureImageAlt, featureOverlayText, bottomLine, seoTitle,
            metaDescription, relatedSlugs } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const images = req.files ? req.files.map(f => f.path) : [];
    const featureImage = images[0] || '';
    const publishedBool = published === 'true' || published === true;

    const blog = await Blog.create({
      title,
      content,
      subtitle: subtitle || '',
      excerpt: excerpt || '',
      category: category || 'General',
      categorySlug: categorySlug || '',
      authorDisplayName: authorDisplayName || "Ray's Healthy Living",
      authorBrandLine: authorBrandLine || "Wellness Education Team",
      readTime: readTime || '',
      featureImage,
      images,
      featureImageAlt: featureImageAlt || '',
      featureOverlayText: featureOverlayText || '',
      bottomLine: bottomLine || '',
      seoTitle: seoTitle || title,
      metaDescription: metaDescription || excerpt || '',
      published: publishedBool,
      publishedAt: publishedBool ? new Date() : undefined,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [],
      relatedSlugs: relatedSlugs ? (typeof relatedSlugs === 'string' ? relatedSlugs.split(',').map(s => s.trim()).filter(Boolean) : relatedSlugs) : [],
      author: req.user._id,
      websiteRole: 'retailer',
    });

    res.status(201).json({ message: 'Blog created successfully', blog });
  } catch (error) {
    console.error('[admin create-blog]', error.message);
    res.status(400).json({ message: error.message });
  }
});

adminRouter.get('/get-blogs', protect, restrictTo('admin'), async (req, res) => {
  try {
    const Blog = require('../Models/blogSchema');
    const { page = 1, limit = 50 } = req.query;
    const blogs = await Blog.find({ websiteRole: 'retailer' })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const totalBlogs = await Blog.countDocuments({ websiteRole: 'retailer' });
    res.status(200).json({ blogs, totalBlogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

adminRouter.get('/get-all-blogs', async (req, res) => {
  try {
    const Blog = require('../Models/blogSchema');
    const blogs = await Blog.find({ websiteRole: 'retailer', published: true })
      .populate('author', 'name')
      .sort({ publishedAt: -1, createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

adminRouter.put('/update-blog/:id', protect, restrictTo('admin'), uploadBlog.array('images', 10), async (req, res) => {
  try {
    const Blog = require('../Models/blogSchema');
    const { title, subtitle, excerpt, content, featureImageAlt, featureOverlayText,
            category, categorySlug, tags, published, readTime, seoTitle, metaDescription,
            existingImages, authorDisplayName, authorBrandLine, bottomLine, relatedSlugs } = req.body;

    // Parse existing images list (sent as JSON string)
    let parsedExisting = [];
    if (existingImages) {
      try {
        parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        if (!Array.isArray(parsedExisting)) parsedExisting = [];
      } catch { parsedExisting = []; }
    }

    const newImages = req.files ? req.files.map(f => f.path) : [];
    const allImages = [...parsedExisting, ...newImages];
    const featureImage = allImages[0] || '';
    const publishedBool = published === 'true' || published === true;

    // Build update with $set — only include fields that were actually sent
    const $set = { updatedAt: Date.now() };
    if (title !== undefined)              $set.title = title;
    if (subtitle !== undefined)           $set.subtitle = subtitle;
    if (excerpt !== undefined)            $set.excerpt = excerpt;
    if (content !== undefined)            $set.content = content;
    if (featureImageAlt !== undefined)    $set.featureImageAlt = featureImageAlt;
    if (featureOverlayText !== undefined) $set.featureOverlayText = featureOverlayText;
    if (category !== undefined)           $set.category = category;
    if (categorySlug !== undefined)       $set.categorySlug = categorySlug;
    if (published !== undefined)          $set.published = publishedBool;
    if (readTime !== undefined)           $set.readTime = readTime;
    if (seoTitle !== undefined)           $set.seoTitle = seoTitle;
    if (metaDescription !== undefined)    $set.metaDescription = metaDescription;
    if (authorDisplayName !== undefined)  $set.authorDisplayName = authorDisplayName;
    if (authorBrandLine !== undefined)    $set.authorBrandLine = authorBrandLine;
    if (bottomLine !== undefined)         $set.bottomLine = bottomLine;
    if (allImages.length > 0 || existingImages !== undefined) {
      $set.images = allImages;
      $set.featureImage = featureImage;
    }
    if (tags !== undefined) {
      $set.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (tags || []);
    }
    if (relatedSlugs !== undefined) {
      $set.relatedSlugs = typeof relatedSlugs === 'string' ? relatedSlugs.split(',').map(s => s.trim()).filter(Boolean) : (relatedSlugs || []);
    }
    if (publishedBool) $set.publishedAt = new Date();

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true, runValidators: false }
    );
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    console.error('[admin update-blog]', error.message);
    res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/delete-blog/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const Blog = require('../Models/blogSchema');
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = adminRouter;