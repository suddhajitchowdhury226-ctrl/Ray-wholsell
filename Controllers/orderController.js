const Order = require('../Models/orderModel');
const User = require('../Models/user');
const Cart = require('../Models/cartModel');
const Product = require('../Models/productModel');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate order confirmation email HTML
const generateOrderConfirmationEmail = (order, userAddress) => {
  const baseUrl = process.env.BACKEND_URL || 'https://ray-wholsell.onrender.com';
  
  const itemsHtml = order.items.map(item => {
    // Build image URL
    let imageUrl = '';
    if (item.product && item.product.images && item.product.images.length > 0) {
      const imagePath = item.product.images[0];
      imageUrl = imagePath.startsWith('http') 
        ? imagePath 
        : `${baseUrl}/${imagePath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
    }
    
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; color: #333;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; border-radius: 4px;"><br/>` : ''}
          <strong>${item.name}</strong>
        </td>
        <td style="padding: 12px; text-align: center; color: #666;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; color: #333;">$${item.price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600; color: #333;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmation</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order!</p>
      </div>
      
      <!-- Order Details -->
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 25px;">
          <h2 style="color: #77a13d; margin: 0 0 15px 0; font-size: 24px;">Order #${order.orderNumber}</h2>
          <p style="color: #666; margin: 5px 0;">Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p style="color: #666; margin: 5px 0;">Status: <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 15px; font-weight: 600;">Pending Review</span></p>
        </div>

        <!-- Delivery Address -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Delivery Address</h3>
          <p style="margin: 5px 0; color: #555;"><strong>${userAddress.name}</strong></p>
          <p style="margin: 5px 0; color: #555;">${userAddress.addressLine1}</p>
          ${userAddress.addressLine2 ? `<p style="margin: 5px 0; color: #555;">${userAddress.addressLine2}</p>` : ''}
          <p style="margin: 5px 0; color: #555;">${userAddress.city}, ${userAddress.state} ${userAddress.zipcode}</p>
          <p style="margin: 5px 0; color: #555;">${userAddress.country}</p>
          <p style="margin: 5px 0; color: #555;">Phone: ${userAddress.contactNumber}</p>
          <p style="margin: 5px 0; color: #555;">Email: ${userAddress.email}</p>
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 15px 12px; text-align: left; color: #333; font-weight: 600;">Product (Image)</th>
                <th style="padding: 15px 12px; text-align: center; color: #333; font-weight: 600;">Qty</th>
                <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Unit Price</th>
                <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Order Summary -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h3>
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          ${order.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #28a745;">
              <span>Discount ${order.couponCode ? `(${order.couponCode})` : ''}:</span>
              <span>-$${order.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
            <span>Shipping:</span>
            <span>${order.shippingCost > 0 ? `$${order.shippingCost.toFixed(2)}` : 'FREE'}</span>
          </div>
          <hr style="border: none; border-top: 2px solid #77a13d; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #333; font-size: 20px; font-weight: bold;">
            <span>Total:</span>
            <span style="color: #77a13d;">$${order.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Next Steps -->
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #007bff;">
          <h3 style="color: #007bff; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
          <p style="margin: 8px 0; color: #555;">• Your order is now under review by our team</p>
          <p style="margin: 8px 0; color: #555;">• We'll process and prepare your items for shipment</p>
          <p style="margin: 8px 0; color: #555;">• You'll receive tracking information once shipped</p>
          <p style="margin: 8px 0; color: #555;">• Questions? Contact us at support@raywholesale.com</p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 5px 0;">
            Thank you for choosing Ray Healthy Living!
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0;">
            © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
};

// Create order from cart checkout
exports.createOrderFromCart = async (req, res) => {
  try {
    const userId = req.user._id; // Use _id from User document
    const { addressId, couponCode, notes, items: requestItems } = req.body;

    console.log('📦 Creating order from cart for user:', userId);
    console.log('📍 Address ID:', addressId);
    console.log('🎫 Coupon code:', couponCode);
    console.log('📦 Items provided in request:', requestItems ? requestItems.length : 0);
    console.log('📦 Request items:', requestItems);

    // Get user with addresses
    const user = await User.findById(userId).populate('addresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let orderItems = [];
    let subtotal = 0;

    // Validate we have either request items or we can fetch from DB
    if (!requestItems || requestItems.length === 0) {
      console.log('⚠️ No items in request, will try backend cart');
    }

    // Priority: Use items from request body (for localStorage-based carts)
    if (requestItems && Array.isArray(requestItems) && requestItems.length > 0) {
      console.log('✅ Using items from request body');
      for (const item of requestItems) {
        console.log(`   Processing item: productId=${item.productId}, qty=${item.quantity}, price=${item.price}`);
        
        if (!item.productId || !item.quantity) {
          throw new Error(`Invalid item: missing productId or quantity. Item: ${JSON.stringify(item)}`);
        }
        
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product ${item.productId} not found` });
        }
        
        const itemPrice = item.price || product.buyPrice || product.sellPrice;
        if (!itemPrice) {
          throw new Error(`Product ${product._id} has no price set (buyPrice: ${product.buyPrice}, sellPrice: ${product.sellPrice})`);
        }
        
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;
        
        console.log(`   ✓ Added ${item.quantity} x ${product.name} @ $${itemPrice} = $${itemTotal}`);
        
        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: itemPrice,
          websiteRole: item.websiteRole || 'user',
          variantId: item.variantId,
          flavour: item.flavour,
        });
      }
    } else {
      // Fallback: Get user's cart from database
      console.log('✅ Using items from backend cart');
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      for (const cartItem of cart.items) {
        const product = cartItem.product;
        if (!product) {
          console.warn('⚠️ Cart item missing product reference');
          continue;
        }
        
        const itemPrice = cartItem.websiteRole === 'wholesaler' ? product.buyPrice : product.sellPrice;
        const itemTotal = itemPrice * cartItem.quantity;
        
        subtotal += itemTotal;
        
        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: cartItem.quantity,
          price: itemPrice,
          websiteRole: cartItem.websiteRole,
          variantId: cartItem.variantId,
          flavour: cartItem.flavour,
        });
      }
    }
    
    console.log('📊 Order summary:', { itemCount: orderItems.length, subtotal });

    // Find the delivery address
    const deliveryAddress = user.addresses.id(addressId);
    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Invalid delivery address' });
    }

    // Apply coupon discount if provided
    let discount = 0;
    if (couponCode) {
      // Add coupon validation logic here if needed
      console.log('🎫 Coupon code provided:', couponCode);
    }

    // Calculate shipping (free for wholesale orders over $100)
    const shippingCost = subtotal >= 100 ? 0 : 15.00;
    const total = subtotal + shippingCost - discount;

    // Generate order number
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD-${timestamp}${random}`;

    // Create the order
    const order = new Order({
      user: userId,
      orderNumber: orderNumber,
      items: orderItems,
      deliveryAddress: {
        title: deliveryAddress.title,
        name: deliveryAddress.name,
        contactNumber: deliveryAddress.contactNumber,
        email: deliveryAddress.email || user.email,
        addressLine1: deliveryAddress.addressLine1,
        addressLine2: deliveryAddress.addressLine2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        country: deliveryAddress.country,
        zipcode: deliveryAddress.zipcode,
      },
      subtotal,
      shippingCost,
      discount,
      total,
      status: 'pending_review',
      couponCode,
      notes: notes || '',
      userEmail: user.email,
      websiteRole: 'wholesaler',
    });

    console.log('🔧 Order object before save:', {
      userId: order.user,
      itemsCount: order.items.length,
      userEmail: order.userEmail,
      total: order.total,
      deliveryEmail: order.deliveryAddress.email
    });

    await order.save();
    console.log('✅ Order created successfully:', order.orderNumber);

    // Clear the user's cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    console.log('🧹 Cart cleared for user:', userId);

    // Populate product data with images for email
    const populatedOrder = await Order.findById(order._id).populate('items.product', 'name images');
    console.log('📦 Order populated with product data for email');

    // Send confirmation email
    try {
      console.log('📧 Attempting to send confirmation email to:', user.email);
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Order Confirmation - ${populatedOrder.orderNumber} - Ray Healthy Living`,
        html: generateOrderConfirmationEmail(populatedOrder, deliveryAddress),
      };

      console.log('📧 Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      const emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ Order confirmation email sent successfully to:', user.email);
      console.log('📧 Email ID:', emailResult.messageId);
      console.log('📧 Email Response:', emailResult.response);
      console.log('🖼️ Product images included in email');
      
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
      console.error('❌ Email error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      // Don't fail the order creation if email fails - just log it
      console.log('⚠️ Order created successfully but email failed - user should still receive success message');
    }

    // Return success response - this ensures the frontend gets the success message
    const successResponse = {
      message: 'Your order checked out successfully',
      order: {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
      },
    };

    console.log('✅ Sending success response to frontend:', {
      message: successResponse.message,
      orderNumber: order.orderNumber,
      total: order.total
    });

    res.status(201).json(successResponse);

  } catch (error) {
    console.error('❌ Error creating order:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Orders retrieved successfully',
      orders,
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      message: 'Order details retrieved successfully',
      order,
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      message: 'Failed to fetch order details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      message: 'Orders retrieved successfully',
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    });

  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        status,
        ...(notes && { notes })
      },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      message: 'Order status updated successfully',
      order,
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};