/**
 * Retailer Order Management Controller
 * Handles orders from Ray-Retailer with admin confirmation flow
 */

const nodemailer = require('nodemailer');
const Order = require('../Models/orderModel');
const User = require('../Models/user');
const Product = require('../Models/productModel');

// Create Retailer Order Request (Pending Admin Confirmation)
exports.createRetailerOrder = async (req, res) => {
  try {
    const { userId, email, phone, shippingAddress, items, pricing, notes } = req.body;

    // Validate required fields
    if (!userId || !email || !shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        message: "Missing required fields: userId, email, shippingAddress, items"
      });
    }

    console.log(`📦 Creating retailer order for user: ${userId}`);
    console.log(`📍 Shipping address: ${shippingAddress.city}, ${shippingAddress.state}`);
    console.log(`🛍️  Items: ${items.length}`);

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify user is retailer
    if (user.role !== 'retailer') {
      return res.status(403).json({ message: "Only retailers can create retailer orders" });
    }

    // Generate Order ID
    const orderId = `RO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Map items to Order schema format
    const validatedItems = items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.retailPrice,
      websiteRole: 'retailer',
      rhlProductId: item.productId,
    }));

    // Create order using existing Order model
    const order = new Order({
      user: userId,
      orderNumber: orderId,
      items: validatedItems,
      deliveryAddress: {
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        contactNumber: shippingAddress.phone,
        email: email,
        addressLine1: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zip,
        country: shippingAddress.country || "United States",
      },
      userEmail: email,
      userContactNumber: phone,
      subtotal: parseFloat(pricing.subtotal),
      total: parseFloat(pricing.total),
      status: 'processing', // Use valid enum value
      paymentStatus: 'pending',
      notes: `Retailer Order - ${notes || 'No additional notes'}`,
      website: 'retailer', // Mark as retailer order
      createdAt: new Date(),
    });

    await order.save();

    console.log(`✅ Order created: ${orderId}`);

    // Send email to admin with order details
    await sendAdminOrderNotification(order);

    // Send confirmation email to user
    await sendUserOrderConfirmation(user, order);

    res.status(201).json({
      success: true,
      message: "Order submitted successfully. Awaiting admin confirmation.",
      orderId: orderId,
      _id: order._id,
      status: "processing",
    });

  } catch (error) {
    console.error("❌ Error creating retailer order:", error);
    res.status(500).json({
      message: error.message || "Failed to create retailer order"
    });
  }
};
    res.status(500).json({
      message: error.message || "Failed to create order"
    });
  }
};

// Get Retailer Orders
exports.getRetailerOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId, orderType: "retailer" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });

  } catch (error) {
    console.error("Error fetching retailer orders:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch orders"
    });
  }
};

// Get Order Details
exports.getRetailerOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      orderType: "retailer"
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch order details"
    });
  }
};

// Admin: Get All Pending Retailer Orders
exports.getPendingRetailerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      orderType: "retailer",
      status: "pending_confirmation"
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });

  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch pending orders"
    });
  }
};

// Admin: Confirm and Modify Order
exports.confirmRetailerOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, shippingCost, notes, taxAmount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update items if modifications were made
    if (items && items.length > 0) {
      order.items = items;
    }

    // Add shipping cost and recalculate total
    const shippingAmount = parseFloat(shippingCost || 0);
    const taxAmt = parseFloat(taxAmount || 0);

    order.pricing.shippingCost = shippingAmount;
    order.pricing.tax = taxAmt;
    order.pricing.finalTotal = order.pricing.subtotalWithMarkup + shippingAmount + taxAmt;

    // Update status to confirmed
    order.status = "confirmed";
    order.adminNotes = notes || "";
    order.confirmedAt = new Date();

    await order.save();

    console.log(`✅ Order ${orderId} confirmed with shipping: $${shippingAmount}`);

    // Send confirmation email to user with final total
    await sendUserOrderConfirmedEmail(order);

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      order,
    });

  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({
      message: error.message || "Failed to confirm order"
    });
  }
};

// Admin: Reject Order
exports.rejectRetailerOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "rejected";
    order.rejectionReason = reason || "No reason provided";
    await order.save();

    // Send rejection email to user
    await sendUserOrderRejectedEmail(order);

    res.status(200).json({
      success: true,
      message: "Order rejected",
      order,
    });

  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({
      message: error.message || "Failed to reject order"
    });
  }
};

// Get Order Invoice (only if confirmed)
exports.getOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      orderType: "retailer",
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow viewing invoice if order is confirmed or paid
    if (!["confirmed", "paid", "shipped", "delivered"].includes(order.status)) {
      return res.status(403).json({
        message: "Invoice not available. Awaiting admin confirmation."
      });
    }

    res.status(200).json({
      success: true,
      invoice: generateInvoiceData(order),
    });

  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch invoice"
    });
  }
};

// Helper: Send Admin Notification Email
async function sendAdminOrderNotification(order) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const itemsList = order.items
      .map(
        (item) =>
          `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${item.retailPrice.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${item.lineTotal.toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_ADMIN || "info@rayshealthyliving.com",
      subject: `New Retailer Order Request - ${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #16a34a; text-align: center;">New Retailer Order Request</h2>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Retailer:</strong> ${order.user?.name || "N/A"}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
          </div>

          <h3 style="color: #1f2937; margin-top: 20px;">Shipping Address</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
            <p>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
            <p>${order.shippingAddress.street}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}</p>
          </div>

          <h3 style="color: #1f2937; margin-top: 20px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>

          <h3 style="color: #1f2937; margin-top: 20px;">Pricing Summary</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span>Subtotal (with 20% markup):</span>
              <span><strong>$${order.pricing.subtotal.toFixed(2)}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
              <span>Shipping Cost (To be added):</span>
              <span><strong>$0.00</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; border-top: 2px solid #ddd; padding-top: 10px;">
              <span style="font-weight: bold; font-size: 16px;">Current Total:</span>
              <span style="font-weight: bold; font-size: 16px; color: #16a34a;">$${order.pricing.total.toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <p><strong>Action Required:</strong> Review this order request and confirm or reject it in your admin panel.</p>
            <p style="color: #666; font-size: 12px;">You can modify product quantities, availability, and add shipping costs.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification sent for order ${order.orderId}`);
  } catch (error) {
    console.error("❌ Failed to send admin notification:", error);
  }
}

// Helper: Send User Order Confirmation Email
async function sendUserOrderConfirmation(user, order) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Received - ${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a; text-align: center;">Order Received!</h2>
          
          <p>Hello ${user.name},</p>
          <p>Thank you for your order. We've received your request and our team is reviewing it.</p>

          <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> <span style="font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px;">${order.orderId}</span></p>
            <p style="margin: 10px 0 0 0;"><strong>Status:</strong> <span style="color: #ff9800;">Awaiting Admin Confirmation</span></p>
          </div>

          <p><strong>Order Summary:</strong></p>
          <ul style="color: #666;">
            <li>${order.items.length} product(s)</li>
            <li>Subtotal: $${order.pricing.subtotal.toFixed(2)}</li>
            <li>Shipping: To be determined</li>
          </ul>

          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">Our team will review your order and confirm availability within 24 hours. You'll receive another email with the final total and shipping details.</p>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            © Ray's Healthy Living<br>
            70 Solomons Island Rd S, Prince Frederick, MD 20678
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Failed to send user confirmation:", error);
  }
}

// Helper: Send Order Confirmed Email
async function sendUserOrderConfirmedEmail(order) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: order.email,
      subject: `Order Confirmed - ${order.orderId} - Ready for Payment`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a; text-align: center;">✓ Order Confirmed!</h2>
          
          <p>Hello,</p>
          <p>Great news! Your order has been confirmed by our team. All items are in stock and ready to ship.</p>

          <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> <span style="font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px;">${order.orderId}</span></p>
            <p style="margin: 10px 0 0 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Confirmed</span></p>
          </div>

          <h3 style="color: #1f2937;">Final Invoice</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Subtotal:</span>
              <span>$${order.pricing.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Shipping:</span>
              <span>$${order.pricing.shippingCost.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0;">
              <span>Tax:</span>
              <span>$${order.pricing.tax.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 15px 0 0 0; padding-top: 10px; border-top: 2px solid #ddd; font-weight: bold; font-size: 16px;">
              <span>Total Due:</span>
              <span style="color: #16a34a;">$${order.pricing.finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style="margin: 20px 0; text-align: center;">
            <a href="#" style="background: #16a34a; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View & Pay Invoice</a>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            © Ray's Healthy Living
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmed email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Failed to send confirmed email:", error);
  }
}

// Helper: Send Order Rejected Email
async function sendUserOrderRejectedEmail(order) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: order.email,
      subject: `Order Cannot Be Fulfilled - ${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; text-align: center;">Order Cannot Be Fulfilled</h2>
          
          <p>Hello,</p>
          <p>Unfortunately, we're unable to fulfill your order at this time.</p>

          <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> <span style="font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px;">${order.orderId}</span></p>
            <p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${order.rejectionReason}</p>
          </div>

          <p>Please contact our support team if you have any questions or would like to discuss alternative options.</p>

          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            © Ray's Healthy Living
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order rejected email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Failed to send rejected email:", error);
  }
}

// Helper: Generate Invoice Data
function generateInvoiceData(order) {
  return {
    orderId: order.orderId,
    invoiceDate: new Date(order.confirmedAt || order.createdAt).toLocaleDateString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    customer: {
      name: order.user?.name,
      email: order.email,
      phone: order.phone,
    },
    shippingAddress: order.shippingAddress,
    items: order.items,
    pricing: order.pricing,
    notes: order.notes,
  };
}

module.exports = exports;
