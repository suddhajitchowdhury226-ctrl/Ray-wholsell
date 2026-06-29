// const express = require("express");
// const router = express.Router();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// const purchaseModel = require("../Models/purchaseModel");
// const cartModel = require("../Models/cartModel");

// const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

// router.post("/stripe", async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     // ✅ Use raw body from express.raw middleware
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//   } catch (err) {
//     console.error("[Webhook] Signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }
  
  

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     const userId = session.metadata.userId;
//     const cartId = session.metadata.cartId;
//     const paymentIntentId = session.payment_intent;

//     try {
//       const cart = await cartModel.findById(cartId).populate("items.product");
//       if (!cart || cart.items.length === 0) {
//         return res.status(400).json({ message: "Cart not found or empty" });
//       }
      

//       const existingPurchase = await purchaseModel.findOne({ purchaseId: session.id });
//       if (existingPurchase) return res.status(200).send("Purchase already exists");

//       const purchase = await purchaseModel.create({
//         user: userId,
//         items: cart.items.map(item => ({
//           product: item.product._id,
//           quantity: item.quantity,
//           price: item.product.sellPrice,
//         })),
//         total: session.amount_total / 100,
//         purchaseId: session.id,
//         paymentIntentId: paymentIntentId,
//         status: "completed",
//       });

//       await cartModel.findByIdAndUpdate(cartId, { items: [] });
//       console.log(`[Webhook] Purchase stored: ${purchase._id}`);
//       return res.status(200).send("Success");
//     } catch (err) {
//       console.error("[Webhook] Error storing purchase:", err);
//       return res.status(500).send("Internal Server Error");
//     }
//   } else {
//     console.log(`[Webhook] Unhandled event type: ${event.type}`);
//     return res.status(200).send("Event received");
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const purchaseModel = require("../Models/purchaseModel");
const cartModel = require("../Models/cartModel");

const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

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
    const userId = session.metadata.userId;
    const paymentIntentId = session.payment_intent;
    const cartItems = JSON.parse(session.metadata.cartItems || "[]");
    const shippingCost = session.metadata.shippingCost
      ? parseFloat(session.metadata.shippingCost)
      : 0;

    try {
      // Fetch the user's cart
      const cart = await cartModel
        .findOne({ user: userId })
        .populate("items.product");
      if (!cart || cart.items.length === 0) {
        console.error("[Webhook] Cart not found or empty for user:", userId);
        return res.status(400).json({ message: "Cart not found or empty" });
      }

      // Check for existing purchase
      const existingPurchase = await purchaseModel.findOne({
        purchaseId: session.id,
      });
      if (existingPurchase) {
        console.log("[Webhook] Purchase already exists:", session.id);
        return res.status(200).send("Purchase already exists");
      }

      // Calculate product total
      const productTotal = cart.items.reduce(
        (sum, item) => sum + (item.product.buyPrice || 0) * item.quantity,
        0
      );

      // Create purchase record
      const purchase = await purchaseModel.create({
        user: userId,
        items: cart.items.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.buyPrice, // Use buyPrice for consistency
        })),
        total: session.amount_total / 100, // Includes shipping cost
        shippingCost: shippingCost, // Store shipping cost separately
        purchaseId: session.id,
        paymentIntentId: paymentIntentId,
        status: "completed",
      });

      // Clear the cart
      await cartModel.findOneAndUpdate(
        { user: userId },
        { items: [] },
        { new: true }
      );

      console.log(
        `[Webhook] Purchase stored: ${purchase._id}, Total: $${purchase.total}, Shipping: $${shippingCost}`
      );
      return res.status(200).send("Success");
    } catch (err) {
      console.error("[Webhook] Error storing purchase:", err);
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log(`[Webhook] Unhandled event type: ${event.type}`);
    return res.status(200).send("Event received");
  }
});

module.exports = router;