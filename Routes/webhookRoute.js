const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const purchaseModel = require("../Models/purchaseModel");
const cartModel = require("../Models/cartModel");
const User = require("../Models/user"); // Fixed import path
const Product = require("../Models/productModel");
const nodemailer = require('nodemailer');

const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

// Configure email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email template for order confirmation
const generateOrderConfirmationEmail = (orderData) => {
  const { userName, userEmail, items, total, shippingCost, orderId, shippingAddress } = orderData;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
        <h1>Order Confirmation</h1>
        <p>Thank you for your order, ${userName}!</p>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        
        <h3>Shipping Address:</h3>
        <p>${shippingAddress.name}<br>
           ${shippingAddress.address1}<br>
           ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}<br>
           ${shippingAddress.country}</p>
           
        <h3>Items Ordered:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <p><strong>Subtotal: $${(total - shippingCost).toFixed(2)}</strong></p>
          <p><strong>Shipping: $${shippingCost.toFixed(2)}</strong></p>
          <p style="font-size: 18px; color: #4CAF50;"><strong>Total: $${total.toFixed(2)}</strong></p>
        </div>
      </div>
      
      <div style="padding: 20px; background-color: #e8f5e8; text-align: center;">
        <p>We'll send you a shipping confirmation email once your order ships.</p>
        <p>Thank you for choosing Ray Wholesale!</p>
      </div>
    </div>
  `;
};

// Admin notification email
const generateAdminNotificationEmail = (orderData) => {
  const { userName, userEmail, items, total, shippingCost, orderId, shippingAddress } = orderData;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
        <h1>New Order Received</h1>
        <p>Order #${orderId}</p>
      </div>
      
      <div style="padding: 20px;">
        <h2>Customer Information</h2>
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Order Total:</strong> $${total.toFixed(2)}</p>
        
        <h3>Shipping Address:</h3>
        <p>${shippingAddress.name}<br>
           ${shippingAddress.address1}<br>
           ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}<br>
           ${shippingAddress.country}</p>
           
        <h3>Items Ordered:</h3>
        <ul>
          ${items.map(item => `
            <li>${item.product.name} - Qty: ${item.quantity} - $${item.price.toFixed(2)}</li>
          `).join('')}
        </ul>
        
        <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7;">
          <strong>Action Required:</strong> Please process this order in the admin panel.
        </p>
      </div>
    </div>
  `;
};

router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("[Webhook] Processing checkout session:", session.id);

    try {
      const userId = session.metadata.userId;
      const addressId = session.metadata.addressId;
      const shippingCost = parseFloat(session.metadata.shippingCost || '0');
      const cartItems = JSON.parse(session.metadata.cartItems || "[]");
      const userEmail = session.metadata.userEmail;
      const userName = session.metadata.userName;
      const shippingAddress = JSON.parse(session.metadata.shippingAddress || '{}');

      if (!userId || !addressId || !cartItems.length) {
        console.error("[Webhook] Missing required metadata");
        return res.status(400).send("Missing required metadata");
      }

      // Check for existing purchase
      const existingPurchase = await purchaseModel.findOne({
        purchaseId: session.id,
      });
      if (existingPurchase) {
        console.log("[Webhook] Purchase already exists:", session.id);
        return res.status(200).send("Purchase already exists");
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        console.error("[Webhook] User not found:", userId);
        return res.status(404).send("User not found");
      }

      // Create purchase record
      const purchaseItems = cartItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.buyPrice,
        websiteRole: 'wholesaler'
      }));

      const purchase = new purchaseModel({
        user: userId,
        items: purchaseItems,
        total: session.amount_total / 100,
        shippingCost: shippingCost,
        purchaseId: session.id,
        paymentIntentId: session.payment_intent,
        address: addressId,
        status: "completed",
      });

      await purchase.save();
      console.log(`[Webhook] Purchase saved: ${purchase._id}`);

      // Clear user's cart
      await cartModel.findOneAndUpdate(
        { user: userId }, 
        { items: [] },
        { upsert: true }
      );

      // Reduce product inventory
      for (const item of cartItems) {
        try {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
        } catch (inventoryError) {
          console.error("[Webhook] Inventory update failed:", inventoryError);
        }
      }
      console.log("[Webhook] Inventory updated");

      // Prepare email data
      const emailData = {
        userName: userName || user.username || 'Valued Customer',
        userEmail: userEmail || user.email,
        items: cartItems,
        total: session.amount_total / 100,
        shippingCost: shippingCost,
        orderId: session.id,
        shippingAddress: shippingAddress
      };

      // Send order confirmation email to customer
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userEmail || user.email,
          subject: `Order Confirmation - #${session.id}`,
          html: generateOrderConfirmationEmail(emailData)
        });
        console.log("[Webhook] Order confirmation email sent to customer");
      } catch (emailError) {
        console.error("[Webhook] Failed to send customer email:", emailError);
      }

      // Send notification email to admin
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, // Send to admin email
          subject: `New Order Received - #${session.id}`,
          html: generateAdminNotificationEmail(emailData)
        });
        console.log("[Webhook] Admin notification email sent");
      } catch (emailError) {
        console.error("[Webhook] Failed to send admin email:", emailError);
      }

      return res.status(200).send("Success");
    } catch (err) {
      console.error("[Webhook] Error processing checkout:", err);
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log(`[Webhook] Unhandled event type: ${event.type}`);
    return res.status(200).send("Event received");
  }
});

module.exports = router;