const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../Middleware/authMiddleware');

const {
  initializeManufacturers,
  getAllManufacturers,
  getManufacturer,
  updateManufacturer,
  getProductsByManufacturer,
  routeOrderByManufacturer,
  assignProductsToManufacturer,
  createManufacturerInquiries,
  getManufacturerStats
} = require('../Controllers/manufacturerController');

// ===== PUBLIC ROUTES =====
// Get all manufacturers (public info)
router.get('/all', getAllManufacturers);

// Get specific manufacturer
router.get('/:manufacturerId', getManufacturer);

// ===== ADMIN ROUTES =====
// Initialize default manufacturers
router.post('/setup/initialize', protect, restrictTo('admin'), initializeManufacturers);

// Update manufacturer
router.patch('/:manufacturerId', protect, restrictTo('admin'), updateManufacturer);

// Get products by manufacturer
router.get('/:manufacturerId/products', protect, restrictTo('admin'), getProductsByManufacturer);

// Get all products grouped by manufacturer
router.get('/', protect, restrictTo('admin'), getProductsByManufacturer);

// Assign products to manufacturer
router.post('/assign/products', protect, restrictTo('admin'), assignProductsToManufacturer);

// ===== ORDER ROUTING =====
// Route order by manufacturer
router.get('/orders/:orderId/route', protect, restrictTo('admin'), routeOrderByManufacturer);

// Create manufacturer inquiries for order
router.get('/orders/:orderId/inquiries', protect, restrictTo('admin'), createManufacturerInquiries);

// ===== STATISTICS =====
// Get manufacturer statistics
router.get('/stats/overview', protect, restrictTo('admin'), getManufacturerStats);

module.exports = router;
