const express = require('express');
const bulkRouter = express.Router();
const bulkController = require('../Controllers/bulkController');
const { protect, restrictTo } = require("../Middleware/tokenVerify");

bulkRouter.get('/get-bulk-order', bulkController.getBulkOrder);
bulkRouter.post('/set-bulk-order', protect, bulkController.setBulkOrder);
bulkRouter.put('/update-bulk-order', protect, bulkController.updateBulkOrder); 

module.exports = bulkRouter;