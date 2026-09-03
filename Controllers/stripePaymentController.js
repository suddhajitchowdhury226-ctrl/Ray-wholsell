const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../Models/orderModel');

/**
 * Stripe Payment Controller for RayOne Wholesale
 * 
 * Workflow:
 * 1. Create PaymentIntent with amount_details (authorization first)
 * 2. Client confirms payment on frontend
 * 3. Order enters "payment_authorized" status
 * 4. Admin reviews and confirms final amount with manufacturer
 * 5. Capture the final amount from authorization
 * 6. Release unused authorization if less than initial
 */

// ===== STEP 1: Create Authorization (not immediate capture) =====
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId, amount, currency = 'USD', customerEmail } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, amount' 
      });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create PaymentIntent with capture_method set to 'manual'
    // This authorizes the card but doesn't immediately capture the funds
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      capture_method: 'manual', // KEY: Authorize but don't capture yet
      customer_email: customerEmail || order.userEmail,
      description: `RayOne Wholesale Order ${order.orderNumber}`,
      metadata: {
        orderId: orderId.toString(),
        orderNumber: order.orderNumber,
        orderType: 'wholesale',
        purpose: 'Authorization only - manual capture pending'
      },
      // Statement descriptor for customer's bank statement
      statement_descriptor: 'RayOne Wholesale',
      // Enable manual confirmation
      confirm: false
    });

    // Update order with payment information
    order.payment = {
      method: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      authorizedAmount: amount,
      authorizationTimestamp: new Date(),
      authorizationStatus: 'pending'
    };
    order.status = 'payment_authorized';
    await order.save();

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      message: 'PaymentIntent created. Card authorization will be requested on client.'
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
  }
};

// ===== STEP 2: Confirm Payment on Client (Authorization) =====
// This is called from the frontend after customer confirms
exports.confirmPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: paymentIntentId, orderId' 
      });
    }

    // Get the PaymentIntent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'requires_confirmation') {
      if (paymentIntent.status === 'succeeded') {
        return res.status(400).json({ 
          error: 'PaymentIntent was automatically captured. Expected manual capture mode.'
        });
      }
      if (paymentIntent.status === 'requires_payment_method') {
        return res.status(400).json({ 
          error: 'No payment method attached' 
        });
      }
      if (paymentIntent.status === 'canceled') {
        return res.status(400).json({ 
          error: 'PaymentIntent was canceled' 
        });
      }
    }

    // Update order status
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.payment.authorizationStatus = 'authorized';
    order.payment.authorizationTimestamp = new Date();
    // Authorization typically valid for 7 days, varies by card network
    order.payment.authorizationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    order.status = 'requested'; // Move to next stage: admin review
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment authorization confirmed. Order awaiting admin review.',
      paymentIntentId: paymentIntentId,
      status: paymentIntent.status,
      authorizedAmount: paymentIntent.amount / 100
    });

  } catch (error) {
    console.error('Error confirming payment intent:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to confirm payment' 
    });
  }
};

// ===== STEP 3: Capture Final Amount (after admin confirms final qty/pricing) =====
exports.capturePayment = async (req, res) => {
  try {
    const { orderId, captureAmount } = req.body;

    if (!orderId || !captureAmount) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, captureAmount' 
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment || !order.payment.stripePaymentIntentId) {
      return res.status(400).json({ 
        error: 'No payment intent found for this order' 
      });
    }

    const paymentIntentId = order.payment.stripePaymentIntentId;
    const authorizedAmount = order.payment.authorizedAmount;

    // Validate capture amount doesn't exceed authorized amount
    if (captureAmount > authorizedAmount) {
      return res.status(400).json({ 
        error: `Capture amount ($${captureAmount}) cannot exceed authorized amount ($${authorizedAmount})`
      });
    }

    // Check if authorization has expired
    if (order.payment.authorizationExpiresAt && new Date() > order.payment.authorizationExpiresAt) {
      return res.status(400).json({ 
        error: 'Authorization has expired. New authorization required.'
      });
    }

    // Capture the payment
    const charge = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: Math.round(captureAmount * 100) // Convert to cents
    });

    // Calculate released amount
    const releasedAmount = authorizedAmount - captureAmount;

    // Update order with capture details
    order.payment.capturedAmount = captureAmount;
    order.payment.captureTimestamp = new Date();
    order.payment.releasedAmount = releasedAmount > 0 ? releasedAmount : 0;
    order.payment.authorizationStatus = 'captured';
    order.payment.stripeChargeId = charge.charges.data[0].id;
    order.finalTotal = captureAmount;
    order.total = captureAmount;
    order.status = 'payment_captured';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment captured successfully',
      capturedAmount: captureAmount,
      releasedAmount: releasedAmount,
      chargeId: charge.charges.data[0].id,
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('Error capturing payment:', error);
    
    // Update order with error
    const order = await Order.findById(req.body.orderId);
    if (order) {
      order.payment.authorizationStatus = 'failed';
      order.payment.paymentError = error.message;
      await order.save();
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to capture payment' 
    });
  }
};

// ===== STEP 4: Release Unused Authorization =====
exports.releaseAuthorization = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment || !order.payment.stripePaymentIntentId) {
      return res.status(400).json({ 
        error: 'No payment intent found for this order' 
      });
    }

    const paymentIntentId = order.payment.stripePaymentIntentId;

    // Cancel the PaymentIntent to release the authorization
    const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    // Update order
    order.payment.authorizationStatus = 'cancelled';
    order.status = 'cancelled';
    order.payment.paymentError = 'Authorization was released by merchant';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Authorization released',
      paymentIntentId: paymentIntentId,
      status: canceledIntent.status
    });

  } catch (error) {
    console.error('Error releasing authorization:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to release authorization' 
    });
  }
};

// ===== UTILITY: Get Payment Status =====
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment || !order.payment.stripePaymentIntentId) {
      return res.status(400).json({ 
        error: 'No payment information for this order' 
      });
    }

    // Get latest status from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.payment.stripePaymentIntentId
    );

    return res.status(200).json({
      success: true,
      orderNumber: order.orderNumber,
      status: paymentIntent.status,
      authorizedAmount: order.payment.authorizedAmount,
      capturedAmount: order.payment.capturedAmount || 0,
      releasedAmount: order.payment.releasedAmount || 0,
      chargeId: order.payment.stripeChargeId || null,
      authorizationExpires: order.payment.authorizationExpiresAt,
      paymentError: order.payment.paymentError || null
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get payment status' 
    });
  }
};

// ===== WEBHOOK: Handle Stripe Events =====
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // This shouldn't happen with manual capture, but handle it
        console.log('Payment intent succeeded:', event.data.object);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        const failedOrder = await Order.findOne({
          'payment.stripePaymentIntentId': failedIntent.id
        });
        if (failedOrder) {
          failedOrder.payment.authorizationStatus = 'failed';
          failedOrder.payment.paymentError = failedIntent.last_payment_error?.message;
          failedOrder.status = 'cancelled';
          await failedOrder.save();
        }
        break;

      case 'charge.captured':
        const capturedCharge = event.data.object;
        const capturedOrder = await Order.findOne({
          'payment.stripePaymentIntentId': capturedCharge.payment_intent
        });
        if (capturedOrder) {
          capturedOrder.payment.authorizationStatus = 'captured';
          capturedOrder.payment.stripeChargeId = capturedCharge.id;
          await capturedOrder.save();
        }
        break;

      case 'charge.refunded':
        console.log('Charge refunded:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
