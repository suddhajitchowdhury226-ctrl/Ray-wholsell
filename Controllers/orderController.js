const Order = require('../Models/orderModel');
const User = require('../Models/user');
const Cart = require('../Models/cartModel');
const Product = require('../Models/productModel');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
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

// Generate admin notification email HTML
const generateAdminOrderNotificationEmail = (order, user, userAddress) => {
  const baseUrl = process.env.BACKEND_URL || 'https://ray-wholsell.onrender.com';
  
  const itemsHtml = order.items.map(item => {
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; color: #333;"><strong>${item.name}</strong></td>
        <td style="padding: 12px; text-align: center; color: #666;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; color: #333;">$${item.price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600; color: #333;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #d9534f, #c9302c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔔 NEW ORDER ALERT</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">A new order has been received!</p>
      </div>
      
      <!-- Order Details -->
      <div style="background: #fff; padding: 30px; border: 1px solid #eee;">
        <div style="margin-bottom: 25px;">
          <h2 style="color: #d9534f; margin: 0 0 15px 0; font-size: 24px;">Order #${order.orderNumber}</h2>
          <p style="color: #666; margin: 5px 0;"><strong>Total Amount:</strong> $${order.total.toFixed(2)}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
        </div>

        <!-- Customer Info -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Customer Information</h3>
          <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${user.name}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Delivery Contact:</strong> ${userAddress.contactNumber}</p>
        </div>

        <!-- Delivery Address -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Delivery Address</h3>
          <p style="margin: 5px 0; color: #555;"><strong>${userAddress.name}</strong></p>
          <p style="margin: 5px 0; color: #555;">${userAddress.addressLine1}</p>
          ${userAddress.addressLine2 ? `<p style="margin: 5px 0; color: #555;">${userAddress.addressLine2}</p>` : ''}
          <p style="margin: 5px 0; color: #555;">${userAddress.city}, ${userAddress.state} ${userAddress.zipcode}</p>
          <p style="margin: 5px 0; color: #555;">${userAddress.country}</p>
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
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
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Order Summary -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h3>
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #555;">
            <span>Shipping:</span>
            <span>${order.shippingCost > 0 ? `$${order.shippingCost.toFixed(2)}` : 'FREE'}</span>
          </div>
          <hr style="border: none; border-top: 2px solid #d9534f; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #333; font-size: 20px; font-weight: bold;">
            <span>Total:</span>
            <span style="color: #d9534f;">$${order.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin-top: 25px;">
          <a href="${baseUrl}/admin/orders/${order._id}" style="background: #d9534f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            View Order in Admin Panel
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 5px 0;">
            This is an automated notification from Ray Healthy Living Order System
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
        // Handle different ID formats: productId, product._id, _id, or product (from backend cart)
        const productId = item.productId || item.product?._id || item._id || item.product;
        const quantity = item.quantity;
        let itemPrice = item.price;
        
        console.log(`   Processing item: productId=${productId}, qty=${quantity}, price=${itemPrice}`);
        
        if (!productId || !quantity) {
          throw new Error(`Invalid item: missing productId or quantity. Item: ${JSON.stringify(item)}`);
        }
        
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: `Product ${productId} not found` });
        }
        
        // Get price from item, or from product variants, or fallback to buyPrice
        if (!itemPrice) {
          itemPrice = product.variants?.[0]?.price || product.buyPrice || product.sellPrice;
        }
        
        if (!itemPrice) {
          throw new Error(`Product ${product._id} has no price set (variants: ${product.variants?.length}, buyPrice: ${product.buyPrice}, sellPrice: ${product.sellPrice})`);
        }
        
        const itemTotal = itemPrice * quantity;
        subtotal += itemTotal;
        
        console.log(`   ✓ Added ${quantity} x ${product.name} @ $${itemPrice} = $${itemTotal}`);
        
        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: quantity,
          price: itemPrice,
          websiteRole: item.websiteRole || 'wholesaler',
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
        
        // Get price from variants first, then fallback to buyPrice/sellPrice
        const basePrice = product.variants?.[0]?.price || product.buyPrice || product.sellPrice;
        const itemPrice = cartItem.websiteRole === 'wholesaler' ? basePrice : basePrice;
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
      status: 'requested',  // Changed from 'pending_review' to match schema enum
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

    // Send confirmation email to USER
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

    // Send notification email to ADMIN
    try {
      console.log('📧 Attempting to send admin notification email to:', process.env.EMAIL_ADMIN);
      const transporter = createTransporter();
      
      const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_ADMIN || process.env.EMAIL_USER,
        subject: `🔔 NEW ORDER NOTIFICATION - ${populatedOrder.orderNumber} - Ray Healthy Living`,
        html: generateAdminOrderNotificationEmail(populatedOrder, user, deliveryAddress),
      };

      console.log('📧 Admin mail options:', {
        from: adminMailOptions.from,
        to: adminMailOptions.to,
        subject: adminMailOptions.subject
      });

      const adminEmailResult = await transporter.sendMail(adminMailOptions);
      console.log('✅ Admin notification email sent successfully');
      console.log('📧 Admin Email ID:', adminEmailResult.messageId);
      console.log('📧 Admin Email Response:', adminEmailResult.response);
      
    } catch (adminEmailError) {
      console.error('❌ Error sending admin notification email:', adminEmailError);
      console.error('❌ Admin email error details:', {
        message: adminEmailError.message,
        code: adminEmailError.code,
        command: adminEmailError.command,
        response: adminEmailError.response
      });
      // Don't fail the order creation if admin email fails - just log it
      console.log('⚠️ User email sent but admin notification failed');
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
    
    // Log the exact problematic line
    if (error.message.includes('price')) {
      console.error('❌ PRICE ISSUE - Product missing price data');
    }
    if (error.message.includes('undefined')) {
      console.error('❌ UNDEFINED ISSUE - Missing required field');
      console.error('❌ Check if item.price is being passed correctly');
    }
    
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

// Send Manufacturer inquiry Email with PDF attachment
exports.sendManufacturerInquiry = async (req, res) => {
  let pdfPath = null;
  try {
    const { orderId, manufacturerEmail, merchantEmail } = req.body;
    
    // Accept both manufacturerEmail and merchantEmail
    const email = manufacturerEmail || merchantEmail;

    if (!orderId || !email) {
      return res.status(400).json({ message: 'Order ID and Manufacturer email are required' });
    }

    // Fetch order with product details
    const order = await Order.findById(orderId)
      .populate('items.product', 'name images sku')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Generate PDF
    const generatePDF = () => {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 40 });
          const fileName = `manufacturer-inquiry-${orderId}-${Date.now()}.pdf`;
          const tempDir = path.join(process.cwd(), 'temp-pdfs');
          
          // Create temp directory if it doesn't exist
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          pdfPath = path.join(tempDir, fileName);
          const stream = fs.createWriteStream(pdfPath);
          
          doc.pipe(stream);

          // Add logo if available
          const logoPath = path.join(process.cwd(), '../Ray-Wholsell/src/assets/images/logos/WholesaleLogo.png');
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 20, { width: 80 });
          }

          // Header
          doc.fontSize(20).font('Helvetica-Bold').text('Product Availability Inquiry', 150, 30);
          doc.fontSize(10).font('Helvetica').text('From: Ray Healthy Living', 150, 60);
          
          doc.moveTo(40, 90).lineTo(555, 90).stroke();
          doc.moveDown();

          // Order Information
          doc.fontSize(12).font('Helvetica-Bold').text('Order Information', 40, 100);
          doc.fontSize(10).font('Helvetica');
          doc.text(`Order Number: #${order.orderNumber || order._id}`, 40, 120);
          doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 40, 135);
          doc.text(`Customer: ${order.user?.name || 'N/A'}`, 40, 150);
          doc.text(`Email: ${order.user?.email || 'N/A'}`, 40, 165);
          
          doc.moveDown(2);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
          doc.moveDown();

          // Products Table Header
          doc.fontSize(12).font('Helvetica-Bold').text('Inquired Products', 40, doc.y);
          doc.moveDown(0.5);

          // Table headers
          const startY = doc.y;
          const col1X = 40, col2X = 280, col3X = 450;
          
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('Product Name', col1X, startY);
          doc.text('SKU', col2X, startY);
          doc.text('Qty', col3X, startY);
          
          doc.moveTo(40, startY + 15).lineTo(555, startY + 15).stroke();
          
          // Table rows
          let currentY = startY + 25;
          doc.font('Helvetica').fontSize(9);
          
          order.items.forEach((item, idx) => {
            const productName = item.product?.name || item.name || 'N/A';
            const sku = item.product?.sku || 'N/A';
            const qty = item.quantity;
            
            // Wrap text if needed
            if (currentY > 700) {
              doc.addPage();
              currentY = 40;
            }
            
            doc.text(productName.substring(0, 35), col1X, currentY, { width: 200 });
            doc.text(sku, col2X, currentY);
            doc.text(qty.toString(), col3X, currentY);
            
            currentY += 20;
          });

          doc.moveTo(40, currentY).lineTo(555, currentY).stroke();
          currentY += 15;

          // Delivery Address
          doc.fontSize(11).font('Helvetica-Bold').text('Delivery Address', 40, currentY);
          currentY += 20;
          doc.fontSize(9).font('Helvetica');
          
          const addr = order.deliveryAddress || {};
          doc.text(`${addr.name || 'N/A'}`, 40, currentY);
          currentY += 12;
          doc.text(`${addr.addressLine1 || ''}`, 40, currentY);
          currentY += 12;
          if (addr.addressLine2) {
            doc.text(`${addr.addressLine2}`, 40, currentY);
            currentY += 12;
          }
          doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.zipcode || ''}`, 40, currentY);
          currentY += 12;
          doc.text(`${addr.country || ''}`, 40, currentY);
          if (addr.contactNumber) {
            currentY += 12;
            doc.text(`Phone: ${addr.contactNumber}`, 40, currentY);
          }

          currentY += 20;
          doc.moveTo(40, currentY).lineTo(555, currentY).stroke();
          currentY += 15;

          // Please Confirm Section
          doc.fontSize(11).font('Helvetica-Bold').text('Please Confirm:', 40, currentY);
          currentY += 15;
          doc.fontSize(9).font('Helvetica');
          doc.text('• Availability of each product', 50, currentY);
          currentY += 12;
          doc.text('• Current pricing (if available)', 50, currentY);
          currentY += 12;
          doc.text('• Delivery timeline', 50, currentY);
          currentY += 12;
          doc.text('• Any minimum order quantities', 50, currentY);

          currentY += 20;
          doc.fontSize(10).font('Helvetica').text(
            'Please reply to this email with your response at your earliest convenience.',
            40, currentY, { width: 500, align: 'left' }
          );

          // Footer
          doc.fontSize(8).font('Helvetica').text(
            `© ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.`,
            40, doc.page.height - 40,
            { align: 'center' }
          );

          doc.end();

          stream.on('finish', () => {
            resolve(pdfPath);
          });

          stream.on('error', (err) => {
            reject(err);
          });

        } catch (error) {
          reject(error);
        }
      });
    };

    // Generate PDF
    const generatedPdfPath = await generatePDF();

    // Create email template with product details (NO PRICE)
    const generateManufacturerInquiryEmail = () => {
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
            <h1 style="color: white; margin: 0; font-size: 24px;">Product Availability inquiry</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">From: Ray Healthy Living</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 15px 0; color: #333;">Dear Manufacturer,</p>
            
            <p style="margin: 0 0 20px 0; color: #555;">
              We have a customer inquiry for the following products. Please confirm if these items are available on your platform:
            </p>
            
            <h3 style="color: #77a13d; margin: 20px 0 15px 0;">Inquired Products:</h3>
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

    // Send email with PDF attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Product Availability inquiry - Order #${order.orderNumber || order._id} - Ray Healthy Living`,
      html: generateManufacturerInquiryEmail(),
      attachments: [
        {
          filename: `manufacturer-inquiry-${order.orderNumber || orderId}.pdf`,
          path: generatedPdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    console.log('📧 Manufacturer inquiry email with PDF sent to:', email);
    console.log('📄 PDF saved at:', generatedPdfPath);

    // Clean up PDF after sending (optional - keep for records)
    // setTimeout(() => {
    //   if (fs.existsSync(generatedPdfPath)) {
    //     fs.unlinkSync(generatedPdfPath);
    //   }
    // }, 5000);

    res.status(200).json({
      message: 'Manufacturer inquiry sent successfully with PDF attachment',
      manufacturerEmail: email,
      orderId,
    });

  } catch (error) {
    console.error('❌ Error sending Manufacturer inquiry:', error);
    
    // Clean up on error
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    
    res.status(500).json({
      message: 'Failed to send Manufacturer inquiry',
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
    console.log('📡 getAllOrders called');
    console.log('   User ID:', req.user?._id);
    console.log('   User Role:', req.user?.role);
    
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

    console.log('📋 Confirm Order Request:');
    console.log('   Body:', JSON.stringify(req.body, null, 2));

    // Convert shippingCost to number if it's a string
    let numericShippingCost = parseFloat(shippingCost);
    if (isNaN(numericShippingCost)) {
      numericShippingCost = 0;
    }

    // Validation
    if (!orderId || !confirmedItems || !Array.isArray(confirmedItems)) {
      console.error('❌ Validation failed:');
      console.error('   orderId:', orderId);
      console.error('   confirmedItems:', confirmedItems);
      console.error('   isArray:', Array.isArray(confirmedItems));
      return res.status(400).json({ 
        message: 'Order ID and confirmedItems array are required' 
      });
    }

    if (typeof numericShippingCost !== 'number' || numericShippingCost < 0) {
      console.error('❌ Shipping cost validation failed:', numericShippingCost);
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

    console.log('🔍 Order details for confirmation:');
    console.log('   Order ID:', orderId);
    console.log('   Current status:', order.status);
    
    // Allow confirmation from draft, requested, or pending_payment
    const allowedStatuses = ['draft', 'requested', 'pending_payment'];
    if (!allowedStatuses.includes(order.status)) {
      console.error('❌ Order status not allowed for confirmation:', order.status);
      return res.status(400).json({ 
        message: `Order cannot be confirmed. Current status: ${order.status}. Allowed statuses: ${allowedStatuses.join(', ')}` 
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
    const newTotal = newSubtotal + numericShippingCost - (order.discount || 0);

    // Update order
    order.confirmedItems = processedItems;
    order.subtotal = newSubtotal;
    order.shippingCost = numericShippingCost;
    order.total = newTotal;
    order.adminNotes = adminNotes || '';
    order.shippingCostSet = {
      amount: numericShippingCost,
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
        shippingCost: numericShippingCost,
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
