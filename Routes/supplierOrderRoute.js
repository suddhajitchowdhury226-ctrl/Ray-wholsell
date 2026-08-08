const express = require('express');
const {
  createSupplierOrder,
  getSupplierOrders,
  getSupplierOrder,
  updateSupplierOrder,
  updateSupplierOrderStatus,
  deleteSupplierOrder
} = require('../Controllers/supplierOrderController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

const router = express.Router();

// All routes require authentication; wholesaler or admin can manage POs
router.post('/',       protect, restrictTo('wholesaler', 'admin'), createSupplierOrder);
router.get('/',        protect, restrictTo('wholesaler', 'admin'), getSupplierOrders);
router.get('/:id',     protect, restrictTo('wholesaler', 'admin'), getSupplierOrder);
router.put('/:id',     protect, restrictTo('wholesaler', 'admin'), updateSupplierOrder);
router.patch('/:id/status', protect, restrictTo('wholesaler', 'admin'), updateSupplierOrderStatus);
router.delete('/:id',  protect, restrictTo('wholesaler', 'admin'), deleteSupplierOrder);

module.exports = router;
