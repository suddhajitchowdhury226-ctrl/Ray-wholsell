/**
 * Product Image Management
 * Handles image upload, listing, updating (reorder/altText/isPrimary), and deletion
 */

const Product = require('../Models/productModel');
const fs = require('fs');
const path = require('path');

// Simple local storage helper (for development)
// In production, replace with S3/Cloudinary
const UPLOAD_DIR = path.join(__dirname, '../uploads/products');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/products/:id/images
 * Upload a new image for a product
 */
const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { altText } = req.body;

    // Validate product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: ${allowedMimes.join(', ')}` 
      });
    }

    // Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${product.rhlId}-${timestamp}-${req.file.originalname}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file to disk
    fs.writeFileSync(filepath, req.file.buffer);

    // Generate URL (for local dev, this is just a relative path)
    // In production, this would be an S3 URL
    const url = `/uploads/products/${filename}`;

    // Determine if this is the first image (should be primary)
    const isFirst = product.images.length === 0;

    // Create image document
    const newImage = {
      url,
      key: filename,
      altText: altText || product.name,
      isPrimary: isFirst,
      order: product.images.length,
      uploadedAt: new Date()
    };

    // Add to product
    product.images.push(newImage);
    await product.save();

    console.log(`✅ Image uploaded for product ${product.rhlId}: ${filename}`);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: product.images[product.images.length - 1]
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/products/:id/images
 * List all images for a product, sorted by order
 */
const getProductImages = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).select('images rhlId name category');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Sort by order field
    const sorted = [...product.images].sort((a, b) => a.order - b.order);

    res.json({
      rhlId: product.rhlId,
      name: product.name,
      category: product.category,
      totalImages: sorted.length,
      images: sorted
    });
  } catch (error) {
    console.error('❌ Error fetching images:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PATCH /api/products/:id/images/:imageId
 * Update image metadata (altText, isPrimary, order)
 */
const updateProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const { altText, isPrimary, order } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the image subdocument
    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // If setting as primary, clear all others first
    if (isPrimary === true) {
      product.images.forEach(img => {
        img.isPrimary = false;
      });
    }

    // Update fields
    if (altText !== undefined) image.altText = altText;
    if (isPrimary !== undefined) image.isPrimary = isPrimary;
    if (order !== undefined) image.order = order;

    await product.save();

    console.log(`✅ Image ${imageId} updated for product ${product.rhlId}`);

    res.json({
      message: 'Image updated successfully',
      image
    });
  } catch (error) {
    console.error('❌ Error updating image:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/products/:id/images/:imageId
 * Delete image from storage and database
 */
const deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const wasPrimary = image.isPrimary;
    const filename = image.key;

    // Delete file from disk
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`✅ File deleted: ${filename}`);
    }

    // Remove from database
    image.deleteOne();

    // If deleted image was primary, promote first remaining image
    if (wasPrimary && product.images.length > 0) {
      const sorted = [...product.images].sort((a, b) => a.order - b.order);
      if (sorted.length > 0) {
        sorted[0].isPrimary = true;
      }
    }

    await product.save();

    console.log(`✅ Image ${imageId} deleted for product ${product.rhlId}`);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadProductImage,
  getProductImages,
  updateProductImage,
  deleteProductImage
};
