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

    // Generate order number - Format: YYYY-NNNNN-XX
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const sequence = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const orderNumber = `${year}-${random}-${sequence}`;

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

// Send Merchant Enquiry Email
exports.sendMerchantEnquiry = async (req, res) => {
  try {
    const { orderId, merchantEmail } = req.body;

    if (!orderId || !merchantEmail) {
      return res.status(400).json({ message: 'Order ID and merchant email are required' });
    }

    // Fetch order with product details
    const order = await Order.findById(orderId)
      .populate('items.product', 'name images sku')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create email template with product details (NO PRICE)
    const generateMerchantEnquiryEmail = () => {
      const itemsHtml = order.items.map(item => {
        const imageUrl = item.product?.images?.[0] 
          ? (item.product.images[0].startsWith('http') 
              ? item.product.images[0] 
              : `${process.env.BACKEND_URL}/${item.product.images[0].replace(/\\/g, '/').replace(/^\/+/, '')}`)
          : '';

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;">
              ${imageUrl ? `<img src="${imageUrl}" alt="${item.product.name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;"><br/>` : ''}
              <strong>${item.product.name}</strong><br/>
              <small style="color: #666;">SKU: ${item.product.sku || 'N/A'}</small><br/>
              <strong>Qty Requested: ${item.quantity}</strong>
            </td>
          </tr>
        `;
      }).join('');

      // Format delivery address
      const addr = order.deliveryAddress || {};
      const addressHtml = `
        <p style="margin: 5px 0; color: #555;"><strong>${addr.name || 'N/A'}</strong></p>
        <p style="margin: 5px 0; color: #555;">${addr.addressLine1 || ''}</p>
        ${addr.addressLine2 ? `<p style="margin: 5px 0; color: #555;">${addr.addressLine2}</p>` : ''}
        <p style="margin: 5px 0; color: #555;">${addr.city || ''}, ${addr.state || ''} ${addr.zipcode || ''}</p>
        <p style="margin: 5px 0; color: #555;">${addr.country || ''}</p>
        ${addr.contactNumber ? `<p style="margin: 5px 0; color: #555;">Phone: ${addr.contactNumber}</p>` : ''}
        ${addr.email ? `<p style="margin: 5px 0; color: #555;">Email: ${addr.email}</p>` : ''}
      `;

      return `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Product Availability Enquiry</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">From: Ray Healthy Living</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 15px 0; color: #333;">Dear Merchant,</p>
            
            <p style="margin: 0 0 20px 0; color: #555;">
              We have a customer enquiry for the following products. Please confirm if these items are available on your platform:
            </p>
            
            <h3 style="color: #77a13d; margin: 20px 0 15px 0;">Enquired Products:</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 15px; text-align: left; color: #333; font-weight: 600;">Product (Image)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Customer Details:</strong></p>
              <p style="margin: 5px 0; color: #555;">Name: ${order.user?.name || 'N/A'}</p>
              <p style="margin: 5px 0; color: #555;">Email: ${order.user?.email || 'N/A'}</p>
              <p style="margin: 5px 0; color: #555;">Order ID: #${order.orderNumber || order._id}</p>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Delivery Address:</strong></p>
              ${addressHtml}
            </div>

            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Please confirm:</strong></p>
              <ul style="margin: 5px 0; color: #555; padding-left: 20px;">
                <li>Availability of each product</li>
                <li>Current pricing (if available)</li>
                <li>Delivery timeline</li>
                <li>Any minimum order quantities</li>
              </ul>
            </div>

            <p style="margin: 20px 0 10px 0; color: #555;">
              Please reply to this email with your response at your earliest convenience.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `;
    };

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: merchantEmail,
      subject: `Product Availability Enquiry - Order #${order.orderNumber || order._id} - Ray Healthy Living`,
      html: generateMerchantEnquiryEmail(),
    };

    await transporter.sendMail(mailOptions);

    console.log('📧 Merchant enquiry email sent to:', merchantEmail);

    res.status(200).json({
      message: 'Merchant enquiry sent successfully',
      merchantEmail,
      orderId,
    });

  } catch (error) {
    console.error('❌ Error sending merchant enquiry:', error);
    res.status(500).json({
      message: 'Failed to send merchant enquiry',
      error: error.message,
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

// Admin: Confirm order with item selection and shipping cost
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId, confirmedItems, shippingCost, adminNotes } = req.body;
    const adminId = req.user._id;

    // Validation
    if (!orderId || !confirmedItems || !Array.isArray(confirmedItems)) {
      return res.status(400).json({ 
        message: 'Order ID and confirmedItems array are required' 
      });
    }

    if (typeof shippingCost !== 'number' || shippingCost < 0) {
      return res.status(400).json({ 
        message: 'Valid shipping cost (non-negative number) is required' 
      });
    }

    // Fetch order
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending_review') {
      return res.status(400).json({ 
        message: `Order cannot be confirmed. Current status: ${order.status}` 
      });
    }

    // Process confirmed items
    const itemsMap = {};
    confirmedItems.forEach(item => {
      itemsMap[item.productId] = item;
    });

    // Calculate new subtotal based on available items only
    let newSubtotal = 0;
    const processedItems = [];
    const unavailableItems = [];

    order.items.forEach(item => {
      const confirmation = itemsMap[item.product._id.toString()] || { isAvailable: false };
      
      if (confirmation.isAvailable) {
        const confirmedQty = confirmation.quantity || item.quantity;
        const itemTotal = item.price * confirmedQty;
        newSubtotal += itemTotal;
        
        processedItems.push({
          productId: item.product._id,
          name: item.name || item.product.name,
          quantity: confirmedQty,
          price: item.price,
          isAvailable: true,
          originalQuantity: item.quantity
        });
      } else {
        unavailableItems.push({
          name: item.name || item.product.name,
          quantity: item.quantity
        });
      }
    });

    // Calculate new total: subtotal + shipping - discount
    const newTotal = newSubtotal + shippingCost - (order.discount || 0);

    // Update order
    order.confirmedItems = processedItems;
    order.subtotal = newSubtotal;
    order.shippingCost = shippingCost;
    order.total = newTotal;
    order.adminNotes = adminNotes || '';
    order.shippingCostSet = {
      amount: shippingCost,
      setBy: adminId,
      setAt: new Date()
    };
    order.status = 'confirmed'; // Awaiting payment
    order.confirmedAt = new Date();
    order.confirmedBy = adminId;

    await order.save();

    // Send confirmation email to customer
    const transporter = createTransporter();
    
    const generateConfirmedOrderEmail = () => {
      const baseUrl = process.env.BACKEND_URL || 'https://ray-wholsell.onrender.com';
      
      const availableItemsHtml = processedItems.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px; color: #333;"><strong>${item.name}</strong></td>
          <td style="padding: 12px; text-align: center; color: #666;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; color: #333;">$${item.price.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right; font-weight: 600; color: #333;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('');

      const unavailableHtml = unavailableItems.length > 0 ? `
        <div style="background: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #333;"><strong>⚠️ Items Not Available:</strong></p>
          <ul style="margin: 5px 0; color: #555; padding-left: 20px;">
            ${unavailableItems.map(item => `<li>${item.name} (Qty: ${item.quantity})</li>`).join('')}
          </ul>
          ${adminNotes ? `<p style="margin: 10px 0 0 0; color: #555; font-style: italic;">Reason: ${adminNotes}</p>` : ''}
        </div>
      ` : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed! ✓</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Awaiting Payment</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 25px;">
              <h2 style="color: #77a13d; margin: 0 0 15px 0; font-size: 24px;">Order #${order.orderNumber}</h2>
              <p style="color: #666; margin: 5px 0;">Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p style="color: #666; margin: 5px 0;">Status: <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 15px; font-weight: 600;">Awaiting Payment</span></p>
            </div>

            ${unavailableHtml}

            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Confirmed Products:</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 15px 12px; text-align: left; color: #333; font-weight: 600;">Product</th>
                    <th style="padding: 15px 12px; text-align: center; color: #333; font-weight: 600;">Qty</th>
                    <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Unit Price</th>
                    <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${availableItemsHtml}
                </tbody>
              </table>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h3>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
                <span>Subtotal:</span>
                <strong>$${newSubtotal.toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
                <span>Shipping Cost:</span>
                <strong>$${shippingCost.toFixed(2)}</strong>
              </div>
              ${order.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
                  <span>Discount:</span>
                  <strong style="color: #4caf50;">-$${order.discount.toFixed(2)}</strong>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; margin: 12px 0 0 0; padding-top: 12px; border-top: 2px solid #ddd; color: #333; font-size: 18px; font-weight: 700;">
                <span>Total Amount:</span>
                <span style="color: #77a13d;">$${newTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin-bottom: 25px; border-radius: 4px;">
              <p style="margin: 0; color: #333;"><strong>Next Step:</strong></p>
              <p style="margin: 5px 0 0 0; color: #555;">Please proceed to payment to complete your order. You can view your order status and payment options in your account.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `;
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.userEmail || order.user?.email,
      subject: `Order Confirmed #${order.orderNumber} - Awaiting Payment`,
      html: generateConfirmedOrderEmail(),
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Order confirmed and email sent to:', order.userEmail);

    res.status(200).json({
      message: 'Order confirmed successfully. Email sent to customer.',
      order,
      summary: {
        orderNumber: order.orderNumber,
        availableItems: processedItems.length,
        unavailableItems: unavailableItems.length,
        subtotal: newSubtotal,
        shippingCost,
        discount: order.discount,
        total: newTotal,
        status: 'confirmed'
      }
    });

  } catch (error) {
    console.error('❌ Error confirming order:', error);
    res.status(500).json({
      message: 'Failed to confirm order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
