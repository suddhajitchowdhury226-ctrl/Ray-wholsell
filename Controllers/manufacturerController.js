const Manufacturer = require('../Models/manufacturerModel');
const Product = require('../Models/productModel');
const Order = require('../Models/orderModel');

/**
 * Manufacturer Controller
 * Handles manufacturer management, routing, and inquiry workflows
 */

// ===== CREATE / SETUP =====
/**
 * Initialize default manufacturers (RHL1, RHL2, RHL3)
 * Called during system setup
 */
exports.initializeManufacturers = async (req, res) => {
  try {
    const defaultManufacturers = [
      {
        manufacturerId: 'RHL1',
        companyName: 'Vitality Works (RHL1)',
        orderingMethod: 'orderdog',
        status: 'active',
        integrationDetails: {
          type: 'orderdog',
          status: 'not_configured',
          technicalNotes: 'OrderDog integration pending technical specification from Vitality Works'
        }
      },
      {
        manufacturerId: 'RHL2',
        companyName: 'RHL2 Manufacturer',
        orderingMethod: 'email',
        status: 'active',
        integrationDetails: {
          type: 'none',
          status: 'not_configured'
        }
      },
      {
        manufacturerId: 'RHL3',
        companyName: 'RHL3 Manufacturer',
        orderingMethod: 'email',
        status: 'active',
        integrationDetails: {
          type: 'none',
          status: 'not_configured'
        }
      }
    ];

    // Check if manufacturers already exist
    for (const mfg of defaultManufacturers) {
      const exists = await Manufacturer.findOne({ manufacturerId: mfg.manufacturerId });
      if (!exists) {
        await Manufacturer.create(mfg);
        console.log(`✅ Created manufacturer: ${mfg.manufacturerId}`);
      } else {
        console.log(`⚠️  Manufacturer ${mfg.manufacturerId} already exists`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Manufacturers initialized successfully',
      count: defaultManufacturers.length
    });
  } catch (error) {
    console.error('Error initializing manufacturers:', error);
    res.status(500).json({
      error: error.message || 'Failed to initialize manufacturers'
    });
  }
};

// ===== READ / LIST =====
/**
 * Get all manufacturers
 */
exports.getAllManufacturers = async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find()
      .select('-integrationDetails.apiKey -integrationDetails.credentials.password')
      .sort({ manufacturerId: 1 });

    res.status(200).json({
      success: true,
      count: manufacturers.length,
      manufacturers
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch manufacturers'
    });
  }
};

/**
 * Get single manufacturer by ID
 */
exports.getManufacturer = async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const manufacturer = await Manufacturer.findOne({ manufacturerId })
      .select('-integrationDetails.apiKey -integrationDetails.credentials.password');

    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }

    res.status(200).json({
      success: true,
      manufacturer
    });
  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch manufacturer'
    });
  }
};

// ===== UPDATE =====
/**
 * Update manufacturer details and integration configuration
 */
exports.updateManufacturer = async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const updateData = req.body;

    const manufacturer = await Manufacturer.findOneAndUpdate(
      { manufacturerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }

    console.log(`✅ Updated manufacturer: ${manufacturerId}`);
    res.status(200).json({
      success: true,
      message: 'Manufacturer updated successfully',
      manufacturer
    });
  } catch (error) {
    console.error('Error updating manufacturer:', error);
    res.status(500).json({
      error: error.message || 'Failed to update manufacturer'
    });
  }
};

// ===== ROUTING LOGIC =====
/**
 * Get products grouped by manufacturer
 * Used to separate orders by supplier
 */
exports.getProductsByManufacturer = async (req, res) => {
  try {
    const { manufacturerId } = req.params;

    if (!manufacturerId) {
      // Return all products grouped by manufacturer
      const groupedProducts = await Product.aggregate([
        {
          $match: { manufacturer: { $exists: true, $ne: null } }
        },
        {
          $group: {
            _id: '$manufacturer',
            products: { $push: '$$ROOT' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return res.status(200).json({
        success: true,
        groupedByManufacturer: groupedProducts
      });
    }

    // Return products for specific manufacturer
    const products = await Product.find({ manufacturer: manufacturerId })
      .select('rhlProductId name manufacturer manufacturerItemNumber sellPrice stock')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      manufacturerId,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products by manufacturer:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch products'
    });
  }
};

// ===== ORDER ROUTING =====
/**
 * Route order items to appropriate manufacturers
 * Returns order split by manufacturer for inquiry sending
 */
exports.routeOrderByManufacturer = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Group items by manufacturer
    const routedOrder = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalItems: order.items.length,
      manufacturerGroups: []
    };

    const manufacturerMap = new Map();

    for (const item of order.items) {
      const manufacturer = item.product?.manufacturer || 'Other';
      
      if (!manufacturerMap.has(manufacturer)) {
        manufacturerMap.set(manufacturer, []);
      }
      
      manufacturerMap.get(manufacturer).push({
        rhlProductId: item.rhlProductId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        manufacturerItemNumber: item.product?.manufacturerItemNumber,
        manufacturer: manufacturer
      });
    }

    // Convert map to array for response
    for (const [manufacturer, items] of manufacturerMap) {
      routedOrder.manufacturerGroups.push({
        manufacturer,
        itemCount: items.length,
        items,
        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      });
    }

    // Sort by manufacturer ID
    routedOrder.manufacturerGroups.sort((a, b) => 
      a.manufacturer.localeCompare(b.manufacturer)
    );

    res.status(200).json({
      success: true,
      routedOrder
    });
  } catch (error) {
    console.error('Error routing order:', error);
    res.status(500).json({
      error: error.message || 'Failed to route order'
    });
  }
};

/**
 * Bulk assign products to manufacturer
 * Used during product data upload
 */
exports.assignProductsToManufacturer = async (req, res) => {
  try {
    const { manufacturerId, productIds } = req.body;

    if (!manufacturerId || !productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        error: 'Missing required fields: manufacturerId, productIds (array)'
      });
    }

    // Verify manufacturer exists
    const manufacturer = await Manufacturer.findOne({ manufacturerId });
    if (!manufacturer) {
      return res.status(404).json({ error: `Manufacturer ${manufacturerId} not found` });
    }

    // Update products
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { manufacturer: manufacturerId }
    );

    console.log(`✅ Assigned ${result.modifiedCount} products to manufacturer: ${manufacturerId}`);

    res.status(200).json({
      success: true,
      message: `Assigned ${result.modifiedCount} products to ${manufacturerId}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error assigning products:', error);
    res.status(500).json({
      error: error.message || 'Failed to assign products'
    });
  }
};

// ===== INQUIRY MANAGEMENT =====
/**
 * Create manufacturer inquiries for order items
 * Splits order by manufacturer and prepares inquiry data
 */
exports.createManufacturerInquiries = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const inquiries = [];
    const manufacturerMap = new Map();

    // Group items by manufacturer
    for (const item of order.items) {
      const manufacturer = item.product?.manufacturer || 'Other';
      
      if (!manufacturerMap.has(manufacturer)) {
        manufacturerMap.set(manufacturer, []);
      }
      
      manufacturerMap.get(manufacturer).push({
        manufacturerItemNumber: item.product?.manufacturerItemNumber,
        rhlProductId: item.rhlProductId,
        productName: item.name,
        quantity: item.quantity,
        bin_location: item.product?.bin_location
      });
    }

    // Create inquiry for each manufacturer
    for (const [manufacturerId, items] of manufacturerMap) {
      const mfgRecord = await Manufacturer.findOne({ manufacturerId });

      inquiries.push({
        manufacturer: manufacturerId,
        manufacturerEmail: mfgRecord?.contactPerson?.email || mfgRecord?.technicalContact?.email,
        orderingMethod: mfgRecord?.orderingMethod,
        itemCount: items.length,
        items,
        deliveryAddress: order.deliveryAddress,
        inquiryDate: new Date(),
        inquiryNumber: `INQ-${order.orderNumber}-${manufacturerId}`
      });
    }

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      inquiryCount: inquiries.length,
      inquiries
    });
  } catch (error) {
    console.error('Error creating inquiries:', error);
    res.status(500).json({
      error: error.message || 'Failed to create inquiries'
    });
  }
};

/**
 * Get manufacturing statistics
 */
exports.getManufacturerStats = async (req, res) => {
  try {
    const stats = await Manufacturer.aggregate([
      {
        $lookup: {
          from: 'products',
          let: { manufacturerId: '$manufacturerId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$manufacturer', '$$manufacturerId'] } } },
            { $count: 'productCount' }
          ],
          as: 'productStats'
        }
      },
      {
        $project: {
          manufacturerId: 1,
          companyName: 1,
          status: 1,
          productCount: { $arrayElemAt: ['$productStats.productCount', 0] },
          integrationStatus: '$integrationDetails.status',
          lastActivityDate: 1,
          totalOrdersPlaced: 1
        }
      },
      { $sort: { manufacturerId: 1 } }
    ]);

    res.status(200).json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    console.error('Error getting manufacturer stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get statistics'
    });
  }
};

module.exports = exports;
