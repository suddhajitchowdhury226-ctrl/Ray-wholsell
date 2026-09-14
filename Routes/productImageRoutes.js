/**
 * Product Image Routes
 * Image upload, list, update, and delete endpoints
 */

const express = require('express');
const multer = require('multer');
const {
  uploadProductImage,
  getProductImages,
  updateProductImage,
  deleteProductImage
} = require('../Controllers/productImageController');

const router = express.Router({ mergeParams: true });

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

/**
 * GET /api/products/:productId/images
 * Get all images for a product
 */
router.get('/', getProductImages);

/**
 * POST /api/products/:productId/images
 * Upload new image
 * Body: { altText?: string }
 * File: multipart/form-data - 'image' field
 */
router.post(
  '/',
  upload.single('image'),
  uploadProductImage
);

/**
 * PATCH /api/products/:productId/images/:imageId
 * Update image metadata
 * Body: { altText?: string, isPrimary?: boolean, order?: number }
 */
router.patch('/:imageId', updateProductImage);

/**
 * DELETE /api/products/:productId/images/:imageId
 * Delete image
 */
router.delete('/:imageId', deleteProductImage);

module.exports = router;
