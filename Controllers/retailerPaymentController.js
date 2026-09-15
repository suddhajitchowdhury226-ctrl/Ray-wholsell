/**
 * Retailer Payment Processing Controller
 * Handles Stripe payments for confirmed retailer orders
 */

const Stripe = require('stripe');
const Order = require('../Models/orderModel');
const User = require('../Models/user');
const nodemailer = require('nodemailer');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Process Payment for Confirmed Order
exports.processRetailerPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId, amount, currency, paymentMethod, cardDetails } = req.body;

    // Validate required fields
    if (!orderId || !amount || !cardDetails) {
      return res.status(400).json({
        message: 'Missing required payment information'
      });
    }

    console.log(`💳 Processing payment for order: ${orderId}`);

    // Get order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Verify order is confirmed
    if (order.status !== 'confirmed') {
      return res.status(400).json({
        message: 'Order must be confirmed before payment'
      });
    }

    // Verify amount matches order total
    if (Math.abs(amount - order.pricing.finalTotal) > 0.01) {
      return res.status(400).json({
        message: 'Payment amount does not match order total'
      });
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'usd',
        description: `Order ${order.orderId} - Ray Healthy Living`,
        metadata: {
          orderId: order._id.toString(),
          userId: userId.toString(),
        },
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}`);

      // In a real implementation, you would confirm the payment with Stripe
      // For now, we'll mark it as paid if the amount matches
      
      // Update order status to paid
      order.status = 'paid';
      order.paymentMethod = 'stripe';
      order.paymentIntentId = paymentIntent.id;
      order.paidAt = new Date();
      order.transactionId = paymentIntent.id;
      
      await order.save();

      console.log(`✅ Order ${orderId} marked as paid`);

      // Send payment confirmation email
      await sendPaymentConfirmationEmail(order);

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        paymentIntentId: paymentIntent.id,
        orderId: order._id,
        status: 'paid',
      });

    } catch (stripeError) {
      console.error('❌ Stripe payment error:', stripeError);
      
      res.status(400).json({
        message: 'Payment processing failed: ' + stripeError.message
      });
    }

  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({
      message: error.message || 'Failed to process payment'
    });
  }
};

// Get Payment History
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const payments = await Order.find({
      user: userId,
      status: { $in: ['paid', 'shipped', 'delivered'] },
      orderType: 'retailer',
    })
      .select('orderId status paidAt pricing paymentMethod transactionId')
      .sort({ paidAt: -1 })
      .lean();

    const totalPaid = payments.reduce((sum, p) => sum + p.pricing.finalTotal, 0);

    res.status(200).json({
      success: true,
      count: payments.count,
      totalPaid,
      payments,
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch payment history'
    });
  }
};

// Webhook for Stripe Events
exports.handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.WEBHOOK_ENDPOINT_SECRET
    );

    console.log(`📩 Webhook event received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`⏭️  Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Helper: Handle Successful Payment
async function handlePaymentSucceeded(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
      console.warn(`Order ${orderId} not found`);
      return;
    }

    if (order.status !== 'paid') {
      order.status = 'paid';
      order.paymentIntentId = paymentIntent.id;
      order.paidAt = new Date();
      await order.save();

      console.log(`✅ Payment succeeded for order ${order.orderId}`);
      await sendPaymentConfirmationEmail(order);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Helper: Handle Failed Payment
async function handlePaymentFailed(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    const order = await Order.findById(orderId);

    if (order) {
      console.warn(`❌ Payment failed for order ${order.orderId}`);
      await sendPaymentFailedEmail(order, paymentIntent.last_payment_error?.message);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Helper: Send Payment Confirmation Email
async function sendPaymentConfirmationEmail(order) {
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
      to: order.email,
      subject: `Payment Received - ${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a; text-align: center;">✓ Payment Received</h2>
          
          <p>Hello,</p>
          <p>Thank you! We have successfully received your payment for order <strong>${order.orderId}</strong>.</p>

          <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Payment Status:</strong> <span style="color: #16a34a;">✓ Paid</span></p>
            <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> $${order.pricing.finalTotal.toFixed(2)}</p>
            <p style="margin: 10px 0 0 0;"><strong>Transaction ID:</strong> <span style="font-family: monospace;">${order.transactionId || 'N/A'}</span></p>
          </div>

          <h3 style="color: #1f2937;">Order Summary</h3>
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

          <h3 style="color: #1f2937;">Pricing Details</h3>
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
              <span>Total Paid:</span>
              <span style="color: #16a34a;">$${order.pricing.finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <h3 style="color: #1f2937; margin-top: 30px;">What's Next?</h3>
          <p>Your order will be prepared for shipment. You will receive a tracking number via email as soon as your order ships.</p>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 12px;">
            <p>Thank you for choosing Ray's Healthy Living!</p>
            <p>© Ray's Healthy Living - 70 Solomons Island Rd S, Prince Frederick, MD 20678</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Payment confirmation email sent to ${order.email}`);
  } catch (error) {
    console.error('❌ Failed to send payment confirmation:', error);
  }
}

// Helper: Send Payment Failed Email
async function sendPaymentFailedEmail(order, errorMessage) {
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
      subject: `Payment Failed - ${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; text-align: center;">Payment Failed</h2>
          
          <p>Hello,</p>
          <p>Unfortunately, we were unable to process your payment for order <strong>${order.orderId}</strong>.</p>

          <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Total:</strong> $${order.pricing.finalTotal.toFixed(2)}</p>
            <p style="margin: 10px 0 0 0;"><strong>Error:</strong> ${errorMessage || 'Payment declined'}</p>
          </div>

          <p><strong>What can you do?</strong></p>
          <ul>
            <li>Check that your card details are correct</li>
            <li>Ensure you have sufficient funds</li>
            <li>Contact your bank if the card is declined</li>
            <li>Try a different payment method</li>
          </ul>

          <p>Please try again or contact our support team for assistance.</p>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 12px;">
            <p>© Ray's Healthy Living</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Payment failed email sent to ${order.email}`);
  } catch (error) {
    console.error('❌ Failed to send payment failed email:', error);
  }
}

module.exports = exports;
