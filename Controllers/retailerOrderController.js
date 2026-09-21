const RetailerOrder = require('../Models/retailerOrderModel');
const Product = require('../Models/productModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Submit order request (user action)
exports.submitOrderRequest = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    const retailerId = req.user._id;

    console.log('📝 Submitting retailer order:', { 
      retailerId, 
      itemCount: items?.length,
      shippingAddress 
    });

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No items in order' 
      });
    }

    // Validate and calculate prices
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        console.error('❌ Product not found:', item.productId);
        return res.status(404).json({ 
          success: false, 
          message: `Product not found: ${item.productId}` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}` 
        });
      }

      // Use sellPrice if wholesalePrice doesn't exist
      const basePrice = product.wholesalePrice || product.sellPrice || product.price || 0;
      
      if (!basePrice || basePrice === 0) {
        console.error('❌ Invalid price for product:', { 
          productId: product._id, 
          name: product.name,
          wholesalePrice: product.wholesalePrice,
          sellPrice: product.sellPrice,
          price: product.price
        });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid price for product: ${product.name}` 
        });
      }

      const retailPrice = basePrice * 1.2; // 20% markup
      const lineTotal = retailPrice * item.quantity;
      subtotal += lineTotal;

      console.log('💰 Product pricing:', {
        name: product.name,
        basePrice,
        retailPrice,
        quantity: item.quantity,
        lineTotal
      });

      processedItems.push({
        product: product._id,
        variantLabel: item.variantLabel || '',
        quantity: item.quantity,
        priceAtOrder: retailPrice
      });
    }

    console.log('💵 Order totals:', { subtotal, itemCount: processedItems.length });

    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `RET-${timestamp}-${random}`;
    console.log('🔢 Generated orderNumber:', orderNumber);

    // Create order with pending status
    const order = new RetailerOrder({
      retailer: retailerId,
      orderNumber: orderNumber,  // ✅ Add orderNumber here!
      items: processedItems,
      subtotal: Number(subtotal.toFixed(2)),
      total: Number(subtotal.toFixed(2)), // Will be updated when admin adds shipping
      shippingAddress,
      status: 'pending'
    });

    console.log('💾 Saving order...');
    await order.save();
    console.log('✅ Order saved:', order.orderNumber);

    // Populate product details for response
    await order.populate('items.product');

    res.status(201).json({
      success: true,
      message: 'Order request submitted successfully',
      order
    });
  } catch (error) {
    console.error('❌ Error submitting order request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit order request',
      error: error.message 
    });
  }
};

// Get retailer's orders
exports.getMyOrders = async (req, res) => {
  try {
    const retailerId = req.user._id;
    
    const orders = await RetailerOrder.find({ retailer: retailerId })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders',
      error: error.message 
    });
  }
};

// Get all pending orders (admin)
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await RetailerOrder.find({ status: 'pending' })
      .populate('retailer', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending orders',
      error: error.message 
    });
  }
};

// Get all orders (admin)
exports.getAllRetailerOrders = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = status ? { status } : {};
    
    const orders = await RetailerOrder.find(query)
      .populate('retailer', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders',
      error: error.message 
    });
  }
};

// Confirm order with shipping (admin action)
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shippingCost, adminNotes } = req.body;

    const order = await RetailerOrder.findById(orderId)
      .populate('retailer', 'name email')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending orders can be confirmed' 
      });
    }

    // Update order with shipping and confirm
    order.shippingCost = shippingCost || 0;
    order.total = order.subtotal + order.shippingCost;
    order.adminNotes = adminNotes || '';
    order.status = 'confirmed';
    order.confirmedAt = new Date();

    await order.save();

    // TODO: Send invoice email to retailer

    res.status(200).json({
      success: true,
      message: 'Order confirmed successfully',
      order
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to confirm order',
      error: error.message 
    });
  }
};

// Create payment intent (user action after confirmation)
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.params;
    const retailerId = req.user._id;

    const order = await RetailerOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.retailer.toString() !== retailerId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be confirmed before payment' 
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        retailerId: retailerId.toString()
      }
    });

    order.paymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: order.total
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment intent',
      error: error.message 
    });
  }
};

// Confirm payment (webhook or manual confirmation)
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;

    const order = await RetailerOrder.findById(orderId)
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be confirmed before payment' 
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment not completed' 
      });
    }

    // Update order status and reduce stock
    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    // Reduce product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      order
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to confirm payment',
      error: error.message 
    });
  }
};

// Cancel order (admin or user)
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await RetailerOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel order at this stage' 
      });
    }

    order.status = 'cancelled';
    order.adminNotes = reason || order.adminNotes;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel order',
      error: error.message 
    });
  }
};
