const BulkOrder = require('../Models/bulkOrderModel');
const { validationResult } = require('express-validator');

// Get current bulk order setting
exports.getBulkOrder = async (req, res) => {
  try {
    const bulkOrder = await BulkOrder.findOne();
    if (!bulkOrder) {
      return res.status(404).json({ message: 'No bulk order setting found' });
    }
    res.status(200).json(bulkOrder);
  } catch (error) {
    console.error('Error fetching bulk order:', error);
    res.status(500).json({ message: 'Server error while fetching bulk order' });
  }
};

// Set new bulk order number
exports.setBulkOrder = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bulkOrderNumber } = req.body;

    // Check if a bulk order setting already exists
    const existingBulkOrder = await BulkOrder.findOne();
    if (existingBulkOrder) {
      return res.status(400).json({ message: 'Bulk order number already set. Use update instead.' });
    }

    // Create new bulk order
    const bulkOrder = new BulkOrder({
      bulkOrderNumber,
    });
    await bulkOrder.save();
    res.status(201).json({ message: 'Bulk order number set successfully' });
  } catch (error) {
    console.error('Error setting bulk order:', error);
    res.status(400).json({ message: error.message || 'Failed to set bulk order number' });
  }
};

// Update existing bulk order number
exports.updateBulkOrder = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bulkOrderNumber } = req.body;

    // Find existing bulk order
    const bulkOrder = await BulkOrder.findOne();
    if (!bulkOrder) {
      return res.status(404).json({ message: 'No bulk order setting found' });
    }

    // Update fields
    bulkOrder.bulkOrderNumber = bulkOrderNumber;
    await bulkOrder.save();
    res.status(200).json({ message: 'Bulk order number updated successfully' });
  } catch (error) {
    console.error('Error updating bulk order:', error);
    res.status(400).json({ message: error.message || 'Failed to update bulk order number' });
  }
};