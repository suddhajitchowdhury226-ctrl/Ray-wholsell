const mongoose = require('mongoose');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../Models/user'); // Ensure this path is correct
const cartModel = require('../Models/cartModel');
const productModel = require('../Models/productModel');
const purchaseModel = require('../Models/purchaseModel');
const axios = require('axios');
const shipmentModel = require('../Models/shipmentModel');


exports.getCart = async (req, res) => {
  const userId = req.user._id;
  const websiteRole = req.headers['x-website-role'] || req.query.websiteRole || req.body.websiteRole;

  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can access cart' });
    }

    const cart = await cartModel
      .findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name buyPrice sellPrice stock images weight dimensions description createdBy variants',
        populate: {
          path: 'createdBy',
          select: 'role'
        }
      })
      .populate('user', 'name email');

    if (!cart) {
      return res.status(200).json({ message: 'Cart is empty', cart: { items: [] } });
    }

    // Filter items by websiteRole if provided
    let filteredItems = cart.items;
    if (websiteRole) {
      filteredItems = cart.items.filter(item => item.websiteRole === websiteRole);
    }

    // Ensure all items have valid product IDs and remove any invalid ones
    const validatedItems = filteredItems.filter(item =>
      item.product &&
      mongoose.Types.ObjectId.isValid(item.product._id) &&
      item.quantity > 0
    );

    if (validatedItems.length < filteredItems.length) {
      console.warn(`Removed ${filteredItems.length - validatedItems.length} invalid items from cart for user ${userId}`);
    }

    const bulkOrderModel = require('../Models/bulkOrderModel');
    const bulkCount = await bulkOrderModel.find({});
    let bulkOrderNumber = bulkCount[0]?.bulkOrderNumber;

    if (!bulkOrderNumber) {
      bulkOrderNumber = 1;
    }


    res.status(200).json({
      message: 'Cart retrieved successfully',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: validatedItems.map(item => {
          // Find variant details if variantId exists
          let variantDetails = null;
          console.log('[DEBUG getCart] Item variantId:', item.variantId);
          console.log('[DEBUG getCart] Product variants array:', item.product.variants ? item.product.variants.length : 'undefined');
          if (item.variantId && item.product.variants) {
            variantDetails = item.product.variants.find(v => v._id.toString() === item.variantId);
            console.log('[DEBUG getCart] Found variantDetails:', variantDetails);
          }

          return {
            product: {
              _id: item.product._id,
              name: item.product.name || 'Unnamed Product',
              buyPrice: item.product.buyPrice || 0,
              sellPrice: item.product.sellPrice || 0,
              stock: item.product.stock || 0,
              images: item.product.images || [],
              weight: item.product.weight || 0.016,
              dimensions: item.product.dimensions || { length: 10, width: 5, height: 2 },
              description: item.product.description || 'No description available',
              createdBy: item.product.createdBy,
            },
            quantity: item.quantity,
            websiteRole: item.websiteRole,
            variantId: item.variantId,
            variantDetails: variantDetails ? {
              variantName: variantDetails.variantName,
              price: variantDetails.price,
              stock: variantDetails.stock,
              sku: variantDetails.sku,
              bin_location: variantDetails.bin_location
            } : null,
            flavour: item.flavour || null,
            bulkOrderNumber
          };
        }),
      },
    });
  } catch (error) {
    console.error('Error in getCart:', error);
    res.status(500).json({ message: error.message || 'Failed to retrieve cart' });
  }
};



exports.addToCart = async (req, res) => {
  const { productId, quantity, websiteRole, variantId, flavour } = req.body;
  const userId = req.user._id;

  logger.info('addToCart called', { path: 'addToCart' });

  try {
    if (req.user.role !== 'user') {
      logger.warn('addToCart: access denied', { path: 'addToCart' });
      return res.status(403).json({ message: 'Only users can add to cart' });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      console.log('Product not found:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Determine stock to check: variant or main product
    let availableStock = product.stock;
    if (variantId) {
      const variant = product.variants.find(v => v._id.toString() === variantId);
      if (!variant) {
        return res.status(404).json({ message: 'Variant not found' });
      }
      availableStock = variant.stock;
    }

    if (availableStock < quantity) {
      console.log(`Insufficient stock. Requested: ${quantity}, Available: ${availableStock}`);
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    let cart = await cartModel.findOne({ user: userId });
    console.log('Fetched existing cart:', cart ? 'Yes' : 'No');

    if (!cart) {
      cart = new cartModel({
        user: userId,
        items: [{ product: productId, quantity, websiteRole, variantId: variantId || null, flavour: flavour || null }],
      });
      await cart.save();
      console.log('New cart created and saved:', cart);
    } else {
      // Find item with same product AND same variantId AND same flavour (or all null)
      const itemIndex = cart.items.findIndex(item =>
        item.product.toString() === productId &&
        ((item.variantId === variantId) || (!item.variantId && !variantId)) &&
        ((item.flavour === flavour) || (!item.flavour && !flavour))
      );
      console.log('Product/Variant/Flavour already in cart index:', itemIndex);

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        console.log('Updated quantity:', cart.items[itemIndex].quantity);
      } else {
        cart.items.push({ product: productId, quantity, websiteRole, variantId: variantId || null, flavour: flavour || null });
        console.log('Added new product to cart');
      }
      await cart.save();
      console.log('Cart saved');
    }

    const updatedCart = await cartModel
      .findById(cart._id)
      .populate('items.product', 'name buyPrice sellPrice stock images')
      .populate('user', 'name email');

    console.log('Final updated cart:', JSON.stringify(updatedCart, null, 2));

    res.status(200).json({
      message: 'Product added to cart successfully',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Error in addToCart:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product already in cart' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user._id;

  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can update cart' });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await cartModel
      .findById(cart._id)
      .populate('items.product', 'name buyPrice sellPrice stock images')
      .populate('user', 'name email');

    res.status(200).json({
      message: 'Cart item updated successfully',
      cart: updatedCart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCartItem = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;

  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can delete from cart' });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const updatedCart = await cartModel
      .findById(cart._id)
      .populate('items.product', 'name buyPrice sellPrice stock images')
      .populate('user', 'name email');

    res.status(200).json({
      message: 'Product removed from cart successfully',
      cart: updatedCart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// exports.createCheckoutSession = async (req, res) => {
//   const userId = req.user._id;
//   const { addressId } = req.body;

//   try {
//     if (req.user.role !== 'user') {
//       return res.status(403).json({ message: 'Only users can create checkout sessions' });
//     }

//     if (!addressId || !mongoose.isValidObjectId(addressId)) {
//       return res.status(400).json({ message: 'Valid shipping address ID is required' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const address = user.addresses.id(addressId);
//     if (!address) {
//       return res.status(400).json({ message: 'Invalid or unauthorized address' });
//     }

//     const cart = await cartModel.findOne({ user: userId }).populate('items.product');
//     if (!cart || cart.items.length === 0) {
//       return res.status(404).json({ message: 'Cart is empty' });
//     }

//     const lineItems = cart.items.map(item => {
//       if (!item.product || !item.product.name || !item.product.buyPrice) {
//         throw new Error(`Invalid product data for product ID: ${item.product?._id}`);
//       }

//       let imageUrl = [];
//       if (item.product.images?.[0]) {
//         const imagePath = item.product.images[0].replace(/\\/g, '/');
//         const fullUrl = `${process.env.BASE_URL}/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;

//         try {
//           const url = new URL(fullUrl);
//           if (url.protocol === 'https:') {
//             imageUrl = [fullUrl];
//           } else {
//             console.warn(`Non-HTTPS image URL for product ${item.product.name}: ${fullUrl}`);
//           }
//         } catch (e) {
//           console.warn(`Invalid image URL for product ${item.product.name}: ${fullUrl}`);
//         }
//       }

//       return {
//         price_data: {
//           currency: 'usd',
//           product_data: {
//             name: item.product.name,
//             images: imageUrl,
//           },
//           unit_amount: Math.round(item.product.buyPrice * 100),
//         },
//         quantity: item.quantity,
//       };
//     });

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: lineItems,
//       mode: 'payment',
//       success_url: `${process.env.FRONTEND_URL}/purchase-summary?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.FRONTEND_URL}/cart`,
//       customer_email: req.user.email,
//       metadata: {
//         userId: userId.toString(),
//         cartId: cart._id.toString(),
//         addressId: addressId.toString(),
//       },
//     });

//     res.status(200).json({ sessionId: session.id, url: session.url });
//   } catch (error) {
//     console.error('Error creating checkout session:', error);
//     let errorMessage = error.message || 'Failed to create checkout session';
//     res.status(500).json({ message: errorMessage });
//   }
// };

// exports.purchaseSummary = async (req, res) => {
//   const { session_id } = req.query;
//   const userId = req.user._id;

//   console.log('[DEBUG] Received session_id:', session_id);
//   console.log('[DEBUG] Authenticated userId:', userId);

//   try {
//     if (!session_id) {
//       console.warn('[WARN] Missing session_id');
//       return res.status(400).json({ message: 'Missing session_id' });
//     }

//     console.log('[DEBUG] Retrieving session from Stripe...');
//     const session = await stripe.checkout.sessions.retrieve(session_id, {
//       expand: ['line_items', 'payment_intent'],
//     });
//     console.log('[DEBUG] Stripe session retrieved:', session.id);

//     if (session.payment_status !== 'paid') {
//       console.warn('[WARN] Payment status is not completed:', session.payment_status);
//       return res.status(400).json({ message: 'Payment not completed' });
//     }

//     const sessionUserId = session.metadata?.userId;
//     const cartId = session.metadata?.cartId;
//     const addressId = session.metadata?.addressId;
//     const paymentIntentId = session.payment_intent?.id;

//     console.log('[DEBUG] Session metadata - userId:', sessionUserId, '| cartId:', cartId, '| addressId:', addressId, '| paymentIntentId:', paymentIntentId);

//     if (!sessionUserId) {
//       console.error('[ERROR] userId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing user ID in session metadata' });
//     }

//     if (!cartId) {
//       console.error('[ERROR] cartId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing cart ID in session metadata' });
//     }

//     if (!addressId) {
//       console.error('[ERROR] addressId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing address ID in session metadata' });
//     }

//     if (!paymentIntentId) {
//       console.error('[ERROR] paymentIntentId missing in session');
//       return res.status(400).json({ message: 'Invalid or missing payment intent ID' });
//     }

//     if (sessionUserId !== userId.toString()) {
//       console.warn('[WARN] Session userId does not match requester userId');
//       return res.status(403).json({ message: 'Unauthorized access to purchase summary' });
//     }

//     console.log('[DEBUG] Checking for existing purchase with session_id:', session_id);
//     let purchase = await purchaseModel.findOne({ purchaseId: session_id });

//     if (purchase) {
//       console.log('[DEBUG] Existing purchase found, returning purchase details...');
//       const populatedPurchase = await purchaseModel
//         .findById(purchase._id)
//         .populate('items.product', 'name buyPrice images')
//         .populate('user', 'name email')
//         .lean();

//       const user = await User.findById(userId).lean();
//       const address = user.addresses.find(addr => addr._id.toString() === purchase.address.toString());
//       if (!address) {
//         return res.status(400).json({ message: 'Address not found in user data' });
//       }
//       populatedPurchase.address = address;

//       console.log('[SUCCESS] Purchase summary prepared and sent');
//       return res.status(200).json({
//         message: 'Purchase completed successfully',
//         purchase: populatedPurchase,
//       });
//     }

//     console.log('[DEBUG] Fetching cart from DB with ID:', cartId);
//     const cart = await cartModel.findById(cartId).populate('items.product');

//     if (!cart) {
//       console.error('[ERROR] Cart not found');
//       return res.status(404).json({ message: 'Cart not found' });
//     }

//     if (cart.items.length === 0) {
//       console.warn('[WARN] Cart is empty');
//       return res.status(400).json({ message: 'Cart is empty' });
//     }

//     console.log('[DEBUG] Creating new purchase record...');
//     for (const item of cart.items) {
//       if (!item.product || typeof item.product.buyPrice !== 'number') {
//         return res.status(400).json({ message: `Invalid product data in cart item ${item._id}` });
//       }
//     }

//     purchase = await purchaseModel.create({
//       user: userId,
//       items: cart.items.map(item => ({
//         product: item.product._id,
//         quantity: item.quantity,
//         price: item.product.buyPrice,
//       })),
//       total: session.amount_total / 100,
//       purchaseId: session_id,
//       paymentIntentId: paymentIntentId,
//       address: addressId,
//       status: 'completed',
//     });

//     console.log('[DEBUG] Purchase created, clearing cart...');
//     await cartModel.findByIdAndUpdate(cartId, { items: [] });

//     console.log('[DEBUG] Populating purchase details for response...');
//     const populatedPurchase = await purchaseModel
//       .findById(purchase._id)
//       .populate('items.product', 'name buyPrice images')
//       .populate('user', 'name email')
//       .lean();

//     const user = await User.findById(userId).lean();
//     const address = user.addresses.find(addr => addr._id.toString() === addressId.toString());
//     if (!address) {
//       return res.status(400).json({ message: 'Address not found in user data' });
//     }
//     populatedPurchase.address = address;

//     console.log('[SUCCESS] Purchase summary prepared and sent');
//     res.status(200).json({
//       message: 'Purchase completed successfully',
//       purchase: populatedPurchase,
//     });
//   } catch (error) {
//     console.error('[ERROR] Error retrieving purchase summary:', error);
//     let errorMessage = error.message || 'Error retrieving purchase summary';
//     if (error.type === 'StripeInvalidRequestError') {
//       errorMessage = 'Invalid session ID provided';
//     }
//     res.status(500).json({ message: errorMessage });
//   }
// };



exports.getAllPurchases = async (req, res) => {
  try {
    const userId = req.user._id;
    const websiteRole = req.query.websiteRole || req.headers['x-website-role'];

    const user = await User.findById(userId).lean();
    if (!user || !Array.isArray(user.addresses)) {
      return res.status(400).json({ message: 'User or address list not found' });
    }

    // Build query to filter by user and optionally by websiteRole
    let query = { user: userId };

    // If websiteRole is provided, filter purchases by items.websiteRole
    if (websiteRole) {
      query['items.websiteRole'] = websiteRole;
    }

    const purchases = await purchaseModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('items.product', 'name buyPrice images createdBy')
      .populate('user', 'name email')
      .populate('shipment', 'shipping status address productDetails trackingUrl createdAt')
      .lean();

    // Get review aggregates for all purchases in one query
    const reviewModel = require('../Models/reviewModel');
    const purchaseIds = purchases.map(p => p.purchaseId || p._id);

    const reviewAggregates = await reviewModel.aggregate([
      { $match: { purchaseId: { $in: purchaseIds } } },
      {
        $group: {
          _id: '$purchaseId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    // Create a map for quick lookup
    const reviewMap = {};
    reviewAggregates.forEach(agg => {
      reviewMap[agg._id] = {
        totalReviews: agg.totalReviews,
        averageRating: Math.round(agg.averageRating * 10) / 10
      };
    });

    // Filter purchases further if websiteRole is specified (additional client-side filtering)
    let filteredPurchases = purchases;
    if (websiteRole) {
      filteredPurchases = purchases.filter(purchase =>
        purchase.items.some(item => item.websiteRole === websiteRole)
      );
    }

    const populatedPurchases = filteredPurchases.map(purchase => {
      const address = user.addresses.find(
        addr => addr._id.toString() === purchase.address?.toString()
      );
      const purchaseKey = purchase.purchaseId || purchase._id;

      // Add displayName with variant and flavour to each item
      const itemsWithDisplayName = purchase.items.map(item => {
        let displayName = item.product?.name || 'Unknown Product';
        if (item.variantName) {
          displayName = `${item.product?.name || 'Unknown Product'} - ${item.variantName}`;
        }
        // Add flavour to display name for Maximum Cardio
        if (item.flavour) {
          displayName = `${displayName} (${item.flavour})`;
        }
        return {
          ...item,
          displayName: displayName,
          product: item.product ? {
            ...item.product,
            displayName: displayName
          } : null
        };
      });

      return {
        ...purchase,
        items: itemsWithDisplayName,
        address: address || null,
        shipmentDetails: purchase.shipment || null,
        reviewAggregate: reviewMap[purchaseKey] || { totalReviews: 0, averageRating: 0 }
      };
    });

    res.status(200).json({
      message: 'User purchase history retrieved',
      purchases: populatedPurchases,
    });
  } catch (error) {
    console.error('[ERROR] getAllPurchases:', error);
    res.status(500).json({ message: 'Error fetching purchase history' });
  }
};

// exports.getAllPurchases = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId).lean();
//     if (!user || !Array.isArray(user.addresses)) {
//       return res.status(400).json({ message: 'User or address list not found' });
//     }

//     const purchases = await purchaseModel
//       .find({ user: userId })
//       .sort({ createdAt: -1 })
//       .populate('items.product', 'name buyPrice images')
//       .populate('user', 'name email')
//       .lean();

//     const populatedPurchases = purchases.map(purchase => {
//       const address = user.addresses.find(
//         addr => addr._id.toString() === purchase.address?.toString()
//       );
//       return {
//         ...purchase,
//         address: address || null,
//       };
//     });

//     res.status(200).json({
//       message: 'User purchase history retrieved',
//       purchases: populatedPurchases,
//     });
//   } catch (error) {
//     console.error('[ERROR] getAllPurchases:', error);
//     res.status(500).json({ message: 'Error fetching purchase history' });
//   }
// };


exports.getPurchaseById = async (req, res) => {
  const purchaseId = req.params.id;
  const userId = req.user._id;

  try {
    const purchase = await purchaseModel
      .findById(purchaseId)
      .populate('items.product', 'name buyPrice images')
      .populate('user', 'name email')
      .lean();

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.user._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied for this order' });
    }

    const user = await User.findById(userId).lean();
    if (!user || !Array.isArray(user.addresses)) {
      return res.status(400).json({ message: 'User or address data is missing' });
    }

    const address = user.addresses.find(
      addr => addr._id.toString() === purchase.address?.toString()
    );

    purchase.address = address || null;

    res.status(200).json({
      message: 'Order details fetched successfully',
      purchase,
    });
  } catch (error) {
    console.error('[ERROR] getPurchaseById:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
};







// --------------latest-----------
// exports.purchaseSummary = async (req, res) => {
//   const { session_id } = req.query;
//   const userId = req.user._id;

//   console.log('[DEBUG] Received session_id:', session_id);
//   console.log('[DEBUG] Authenticated userId:', userId);

//   try {
//     if (!session_id) {
//       console.warn('[WARN] Missing session_id');
//       return res.status(400).json({ message: 'Missing session_id' });
//     }

//     console.log('[DEBUG] Retrieving session from Stripe...');
//     const session = await stripe.checkout.sessions.retrieve(session_id, {
//       expand: ['line_items', 'payment_intent'],
//     });
//     console.log('[DEBUG] Stripe session retrieved:', session.id);

//     if (session.payment_status !== 'paid') {
//       console.warn('[WARN] Payment status is not completed:', session.payment_status);
//       return res.status(400).json({ message: 'Payment not completed' });
//     }

//     const sessionUserId = session.metadata?.userId;
//     const addressId = session.metadata?.addressId;
//     const cartItems = session.metadata?.cartItems;
//     const orderId = session.metadata?.orderId;
//     const paymentIntentId = session.payment_intent?.id;

//     console.log('[DEBUG] Session metadata - userId:', sessionUserId, '| cartItems:', cartItems, '| addressId:', addressId, '| orderId:', orderId, '| paymentIntentId:', paymentIntentId);

//     if (!sessionUserId) {
//       console.error('[ERROR] userId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing user ID in session metadata' });
//     }

//     if (!cartItems) {
//       console.error('[ERROR] cartItems missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing cart items in session metadata' });
//     }

//     if (!addressId) {
//       console.error('[ERROR] addressId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing address ID in session metadata' });
//     }

//     if (!orderId) {
//       console.error('[ERROR] orderId missing in session metadata');
//       return res.status(400).json({ message: 'Invalid or missing order ID in session metadata' });
//     }

//     if (!paymentIntentId) {
//       console.error('[ERROR] paymentIntentId missing in session');
//       return res.status(400).json({ message: 'Invalid or missing payment intent ID' });
//     }

//     if (sessionUserId !== userId.toString()) {
//       console.warn('[WARN] Session userId does not match requester userId');
//       return res.status(403).json({ message: 'Unauthorized access to purchase summary' });
//     }

//     console.log('[DEBUG] Checking for existing purchase with session_id:', session_id);
//     let purchase = await purchaseModel.findOne({ purchaseId: session_id });

//     if (purchase) {
//       console.log('[DEBUG] Existing purchase found, populating details...');
//       const populatedPurchase = await purchaseModel
//         .findById(purchase._id)
//         .populate('items.product', 'name buyPrice images')
//         .populate('user', 'name email')
//         .populate('shipment', 'shipmentId labelId trackingNumber labelDownload')
//         .lean();

//       const user = await User.findById(userId).lean();
//       const address = user.addresses.find(addr => addr._id.toString() === purchase.address.toString());
//       if (!address) {
//         console.error('[ERROR] Address not found in user data');
//         return res.status(400).json({ message: 'Address not found in user data' });
//       }
//       populatedPurchase.address = address;

//       console.log('[SUCCESS] Purchase summary prepared and sent');
//       return res.status(200).json({
//         message: 'Purchase completed successfully',
//         purchase: populatedPurchase,
//       });
//     }

//     console.log('[DEBUG] No existing purchase found, creating new purchase record...');
//     const parsedCartItems = JSON.parse(cartItems);
//     console.log('[DEBUG] Parsed cartItems:', parsedCartItems);

//     if (!Array.isArray(parsedCartItems) || parsedCartItems.length === 0) {
//       console.error('[ERROR] Invalid cart items format');
//       return res.status(400).json({ message: 'Invalid cart items format' });
//     }

//     // Validate product IDs
//     const productIds = parsedCartItems.map(item => item.productId);
//     console.log('[DEBUG] Product IDs:', productIds);

//     const invalidIds = productIds.filter(id => !mongoose.isValidObjectId(id));
//     if (invalidIds.length > 0) {
//       console.error('[ERROR] Invalid product IDs:', invalidIds);
//       return res.status(400).json({ message: `Invalid product IDs: ${invalidIds.join(', ')}` });
//     }

//     const products = await productModel.find({ _id: { $in: productIds } });
//     console.log('[DEBUG] Found products:', products.map(p => p._id.toString()));

//     // If products are missing, use cartItems data as fallback
//     const items = parsedCartItems.map(item => {
//       const product = products.find(p => p._id.toString() === item.productId.toString());
//       return {
//         product: item.productId,
//         quantity: item.quantity,
//         price: product ? product.buyPrice : item.buyPrice || 0,
//       };
//     });

//     // Find shipment by orderId
//     const shipment = await shipmentModel.findOne({ orderId });
//     if (!shipment) {
//       console.error('[ERROR] Shipment not found for orderId:', orderId);
//       return res.status(400).json({ message: 'Shipment not found for this order' });
//     }

//     // Calculate total
//     const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
//       (session.metadata.shippingCost ? parseFloat(session.metadata.shippingCost) : 0);

//     // Create purchase
//     purchase = await purchaseModel.create({
//       user: userId,
//       items,
//       total,
//       purchaseId: session_id,
//       paymentIntentId,
//       address: addressId,
//       shipment: shipment._id,
//       status: 'completed',
//     });

//     console.log('[DEBUG] Purchase created with ID:', purchase._id);

//     // Populate purchase details for response
//     const populatedPurchase = await purchaseModel
//       .findById(purchase._id)
//       .populate('items.product', 'name buyPrice images')
//       .populate('user', 'name email')
//       .populate('shipment', 'shipmentId labelId trackingNumber labelDownload')
//       .lean();

//     const user = await User.findById(userId).lean();
//     const address = user.addresses.find(addr => addr._id.toString() === addressId.toString());
//     if (!address) {
//       console.error('[ERROR] Address not found in user data');
//       return res.status(400).json({ message: 'Address not found in user data' });
//     }
//     populatedPurchase.address = address;

//     console.log('[SUCCESS] Purchase summary prepared and sent');
//     res.status(200).json({
//       message: 'Purchase completed successfully',
//       purchase: populatedPurchase,
//     });
//   } catch (error) {
//     console.error('[ERROR] Error retrieving purchase summary:', error);
//     let errorMessage = error.message || 'Error retrieving purchase summary';
//     if (error.type === 'StripeInvalidRequestError') {
//       errorMessage = 'Invalid session ID provided';
//     }
//     res.status(500).json({ message: errorMessage });
//   }
// };


exports.purchaseSummary = async (req, res) => {
  const { session_id } = req.query;
  const userId = req.user._id;

  try {
    if (!session_id) {
      return res.status(400).json({ message: 'Missing session_id' });
    }

    const result = await finalizeOrderInternal(session_id, userId);

    if (result.purchase) {
      logger.info('purchaseSummary: success');
      return res.status(200).json({
        message: 'Purchase completed successfully',
        shipmentDetails: result.shipmentDetails,
        productDetails: result.productDetails,
        paymentIntentId: result.paymentIntentId,
        purchase: result.purchase
      });
    }

    return res.status(404).json({ message: 'Purchase summary not found. The payment may still be processing.' });
  } catch (error) {
    console.error('[purchaseSummary] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to load purchase summary' });
  }
};

// Helper function to handle multiple packages when total weight exceeds 70 pounds
async function handleWeightBasedMultiplePackages(cartItems, products, address, userId, res) {
  try {
    const MAX_WEIGHT_PER_PACKAGE = 70;
    const packages = [];
    let currentPackageWeight = 0;
    let currentPackageItems = [];

    console.log(`[DEBUG] Splitting items across multiple packages (max 70lbs each)`);

    // Sort items by weight (heaviest first) for better distribution
    const sortedItems = [...cartItems].sort((a, b) => {
      const weightA = products.find(p => p._id.toString() === a.product._id.toString())?.weight || 1;
      const weightB = products.find(p => p._id.toString() === b.product._id.toString())?.weight || 1;
      return (weightB * b.quantity) - (weightA * a.quantity);
    });

    for (const item of sortedItems) {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      const itemWeight = (product?.weight && product.weight > 0 ? product.weight : 1) * item.quantity;

      // If this single item exceeds weight limit, we need to split its quantity
      if (itemWeight > MAX_WEIGHT_PER_PACKAGE) {
        const itemUnitWeight = product?.weight && product.weight > 0 ? product.weight : 1;
        const maxQuantityPerPackage = Math.floor(MAX_WEIGHT_PER_PACKAGE / itemUnitWeight);
        let remainingQuantity = item.quantity;

        while (remainingQuantity > 0) {
          const quantityForThisPackage = Math.min(remainingQuantity, maxQuantityPerPackage);
          const weightForThisPackage = quantityForThisPackage * itemUnitWeight;

          packages.push({
            items: [{ ...item, quantity: quantityForThisPackage }],
            weight: weightForThisPackage
          });

          remainingQuantity -= quantityForThisPackage;
        }
        continue;
      }

      // If adding this item would exceed weight limit, start a new package
      if (currentPackageWeight + itemWeight > MAX_WEIGHT_PER_PACKAGE && currentPackageItems.length > 0) {
        packages.push({
          items: [...currentPackageItems],
          weight: currentPackageWeight
        });
        currentPackageItems = [];
        currentPackageWeight = 0;
      }

      currentPackageItems.push(item);
      currentPackageWeight += itemWeight;
    }

    // Add the last package
    if (currentPackageItems.length > 0) {
      packages.push({
        items: currentPackageItems,
        weight: currentPackageWeight
      });
    }

    console.log(`[DEBUG] Created ${packages.length} packages for weight distribution`);
    packages.forEach((pkg, i) => {
      console.log(`[DEBUG] Package ${i + 1}: ${pkg.weight}lbs, ${pkg.items.length} items`);
    });

    // Calculate shipping rates for each package
    const allRates = [];
    const packageResults = [];

    // Normalize country code
    const countryCode = address.country === 'India' || address.country === 'West India' ? 'IN' :
      address.country === 'Bangladesh' ? 'BD' :
        address.country === 'USA' ? 'US' : address.country;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];

      // Calculate smart dimensions for this package
      let maxLength = 8;
      let maxWidth = 6;
      let calculatedHeight = 3;

      // Find the largest individual item dimensions in this package
      pkg.items.forEach(item => {
        const product = products.find(p => p._id.toString() === item.product._id.toString());
        const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
        const length = Math.max(parseFloat(dimensions.length) || 8, 8);
        const width = Math.max(parseFloat(dimensions.width) || 6, 6);

        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
      });

      // Calculate height based on items in this package (more conservative)
      const itemCount = pkg.items.reduce((sum, item) => sum + item.quantity, 0);
      calculatedHeight = Math.max(3, Math.min(15, itemCount * 0.5 + 3)); // Conservative height calculation

      // Ensure girth compliance: Length + 2*(Width + Height) ≤ 108
      const MAX_GIRTH_PLUS_LENGTH = 108;
      let attempts = 0;
      while (attempts < 5) {
        const currentGirth = maxLength + 2 * (maxWidth + calculatedHeight);

        if (currentGirth <= MAX_GIRTH_PLUS_LENGTH) {
          break; // We're good!
        }

        // Scale down proportionally
        const scaleFactor = (MAX_GIRTH_PLUS_LENGTH * 0.95) / currentGirth;
        maxLength = Math.max(maxLength * scaleFactor, 8);
        maxWidth = Math.max(maxWidth * scaleFactor, 6);
        calculatedHeight = Math.max(calculatedHeight * scaleFactor, 3);

        attempts++;
      }

      const packageDimensions = {
        length: Math.round(maxLength * 100) / 100,
        width: Math.round(maxWidth * 100) / 100,
        height: Math.round(calculatedHeight * 100) / 100,
      };

      const payload = {
        shipment: {
          ship_to: {
            name: address.name,
            address_line1: address.addressLine1,
            address_line2: address.addressLine2 || '',
            city_locality: address.city,
            state_province: address.state,
            postal_code: address.zipcode,
            country_code: countryCode,
            phone: address.contactNumber || '1234567890',
          },
          ship_from: {
            name: 'Your Warehouse',
            address_line1: '123 Warehouse St',
            city_locality: 'Warehouse City',
            state_province: 'CA',
            postal_code: '12345',
            country_code: 'US',
            phone: '9876543210',
          },
          packages: [
            {
              weight: { value: pkg.weight, unit: 'pound' },
              dimensions: {
                length: packageDimensions.length,
                width: packageDimensions.width,
                height: packageDimensions.height,
                unit: 'inch',
              },
            },
          ],
        },
        rate_options: {
          carrier_ids: ['se-3136166'],
          package_types: ['package'],
          service_codes: ['usps_priority_mail_express'],
          calculate_tax_amount: false,
          preferred_currency: 'usd',
          rate_type: 'check',
        },
      };

      try {
        console.log(`[DEBUG] Getting rates for package ${i + 1}/${packages.length}: ${packageDimensions.length}"×${packageDimensions.width}"×${packageDimensions.height}", ${pkg.weight}lbs`);

        const response = await axios.post(
          'https://api.shipengine.com/v1/rates',
          payload,
          {
            headers: {
              'API-Key': process.env.SHIPENGINE_API_KEY || 'your-api-key',
            },
            timeout: 15000,
          }
        );

        const packageRates = response?.data?.rate_response?.rates || [];
        allRates.push(...packageRates);
        packageResults.push({
          packageNumber: i + 1,
          weight: pkg.weight,
          items: pkg.items.length,
          dimensions: packageDimensions,
          success: true,
          rates: packageRates.length
        });

        console.log(`[DEBUG] Package ${i + 1} success: ${packageRates.length} rates found`);

      } catch (error) {
        console.error(`[ERROR] Package ${i + 1} failed:`, error.response?.data || error.message);
        packageResults.push({
          packageNumber: i + 1,
          weight: pkg.weight,
          items: pkg.items.length,
          dimensions: packageDimensions,
          success: false,
          error: error.response?.data?.message || error.message
        });
      }

      // Small delay between API calls
      if (i < packages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (allRates.length === 0) {
      return res.status(400).json({
        message: 'No shipping rates available for any package',
        totalPackages: packages.length,
        packageResults
      });
    }

    // Group rates by service type and sum costs
    const serviceRates = {};
    allRates.forEach(rate => {
      const serviceKey = rate.service_type || 'Unknown Service';
      if (!serviceRates[serviceKey]) {
        serviceRates[serviceKey] = {
          carrier: rate.carrier_friendly_name || 'Unknown Carrier',
          service: serviceKey,
          estimatedDelivery: rate.estimated_delivery_days || 'N/A',
          totalCost: 0,
          currency: rate.shipping_amount?.currency || 'USD',
          packages: 0
        };
      }
      serviceRates[serviceKey].totalCost += parseFloat(rate.shipping_amount?.amount || 0);
      serviceRates[serviceKey].packages++;
    });

    const shippingRates = Object.values(serviceRates).map(rate => ({
      carrier: rate.carrier,
      service: rate.service,
      estimatedDelivery: rate.estimatedDelivery,
      cost: Math.round(rate.totalCost * 100) / 100,
      currency: rate.currency,
      packages: rate.packages,
    }));

    const successfulPackages = packageResults.filter(p => p.success).length;
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const totalItems = packages.reduce((sum, pkg) => sum + pkg.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    return res.status(200).json({
      shippingRates,
      packageInfo: {
        totalPackages: packages.length,
        successfulPackages,
        totalWeight: totalWeight,
        totalItems: totalItems,
        warning: `Order exceeds 70lb limit. Split into ${packages.length} packages (${successfulPackages} calculated successfully).`
      },
      packageDetails: packageResults
    });

  } catch (error) {
    console.error('[ERROR] Weight-based multi-package shipping failed:', error);
    return res.status(500).json({
      message: 'Failed to calculate shipping for heavy order',
      error: error.message
    });
  }
}

// Function to handle creating multiple shipping labels for heavy orders
async function handleWeightBasedMultiplePackagesForLabels(cartItems, products, normalizedAddress, serviceCode, shipEngineApiKey) {
  try {
    const MAX_WEIGHT_PER_PACKAGE = 70;
    const packages = [];
    let currentPackageWeight = 0;
    let currentPackageItems = [];

    console.log(`[DEBUG] Splitting items across multiple packages for label creation (max 70lbs each)`);

    // Sort items by weight (heaviest first) for better distribution
    const sortedItems = [...cartItems].sort((a, b) => {
      const weightA = products.find(p => p._id.toString() === a.product._id.toString())?.weight || 1;
      const weightB = products.find(p => p._id.toString() === b.product._id.toString())?.weight || 1;
      return (weightB * b.quantity) - (weightA * a.quantity);
    });

    for (const item of sortedItems) {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      const itemWeight = (product?.weight && product.weight > 0 ? product.weight : 1) * item.quantity;

      // If this single item exceeds weight limit, we need to split its quantity
      if (itemWeight > MAX_WEIGHT_PER_PACKAGE) {
        const itemUnitWeight = product?.weight && product.weight > 0 ? product.weight : 1;
        const maxQuantityPerPackage = Math.floor(MAX_WEIGHT_PER_PACKAGE / itemUnitWeight);
        let remainingQuantity = item.quantity;

        while (remainingQuantity > 0) {
          const quantityForThisPackage = Math.min(remainingQuantity, maxQuantityPerPackage);
          const weightForThisPackage = quantityForThisPackage * itemUnitWeight;

          packages.push({
            items: [{ ...item, quantity: quantityForThisPackage }],
            weight: weightForThisPackage
          });

          remainingQuantity -= quantityForThisPackage;
        }
        continue;
      }

      // If adding this item would exceed weight limit, start a new package
      if (currentPackageWeight + itemWeight > MAX_WEIGHT_PER_PACKAGE && currentPackageItems.length > 0) {
        packages.push({
          items: [...currentPackageItems],
          weight: currentPackageWeight
        });
        currentPackageItems = [];
        currentPackageWeight = 0;
      }

      currentPackageItems.push(item);
      currentPackageWeight += itemWeight;
    }

    // Add the last package if it has items
    if (currentPackageItems.length > 0) {
      packages.push({
        items: [...currentPackageItems],
        weight: currentPackageWeight
      });
    }

    console.log(`[DEBUG] Split into ${packages.length} packages for label creation`);

    // Create shipping labels for each package
    const labels = [];
    const packageResults = [];

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];

      // Calculate smart dimensions for this package
      let maxLength = 8;
      let maxWidth = 6;
      let calculatedHeight = 2;

      // Find the largest individual item dimensions in this package
      pkg.items.forEach(item => {
        const product = products.find(p => p._id.toString() === item.product._id.toString());
        const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
        const length = Math.max(parseFloat(dimensions.length) || 8, 8);
        const width = Math.max(parseFloat(dimensions.width) || 6, 6);

        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
      });

      // Calculate height based on items in this package
      const packageItemVolume = pkg.items.reduce((volume, item) => {
        const product = products.find(p => p._id.toString() === item.product._id.toString());
        const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
        const height = Math.max(parseFloat(dimensions.height) || 2, 2);
        return volume + (height * item.quantity * 0.7); // 70% packing efficiency
      }, 0);

      calculatedHeight = Math.max(packageItemVolume / (maxLength * maxWidth), 3);
      calculatedHeight = Math.min(calculatedHeight, 15); // Maximum 15 inches height

      // Ensure girth compliance: Length + 2*(Width + Height) ≤ 108
      const MAX_GIRTH_PLUS_LENGTH = 108;
      let attempts = 0;
      while (attempts < 10) {
        const currentGirth = maxLength + 2 * (maxWidth + calculatedHeight);

        if (currentGirth <= MAX_GIRTH_PLUS_LENGTH) {
          break;
        }

        const scaleFactor = (MAX_GIRTH_PLUS_LENGTH * 0.95) / currentGirth;
        maxLength = Math.max(maxLength * scaleFactor, 8);
        maxWidth = Math.max(maxWidth * scaleFactor, 6);
        calculatedHeight = Math.max(calculatedHeight * scaleFactor, 2);

        attempts++;
      }

      const packageDimensions = {
        length: Math.round(maxLength * 100) / 100,
        width: Math.round(maxWidth * 100) / 100,
        height: Math.round(calculatedHeight * 100) / 100,
        unit: 'inch',
      };

      // Calculate insured value for this package
      const packageInsuredValue = pkg.items.reduce((total, item) => {
        const product = products.find(p => p._id.toString() === item.product._id.toString());
        const price = product?.buyPrice && product.buyPrice > 0 ? product.buyPrice : 29.99;
        return total + price * item.quantity;
      }, 0);

      // Create product description for this package
      const packageDescription = pkg.items.map(item => {
        const product = products.find(p => p._id.toString() === item.product._id.toString());
        return `${product?.name || 'Unknown'} (×${item.quantity})`;
      }).join(', ');

      // Create ShipEngine label request for this package
      const labelPayload = {
        shipment: {
          service_code: serviceCode,
          ship_to: normalizedAddress,
          ship_from: {
            name: 'Your Warehouse',
            address_line1: '123 Warehouse St',
            city_locality: 'Warehouse City',
            state_province: 'CA',
            postal_code: '12345',
            country_code: 'US',
            phone: '+1-987-654-3210',
          },
          packages: [
            {
              weight: { value: pkg.weight, unit: 'pound' },
              dimensions: packageDimensions,
              insured_value: { amount: packageInsuredValue, currency: 'USD' },
              label_messages: { reference1: `Package ${i + 1} of ${packages.length}` },
            },
          ],
        },
      };

      try {
        const finalGirth = packageDimensions.length + 2 * (packageDimensions.width + packageDimensions.height);
        console.log(`[DEBUG] Creating label for package ${i + 1}/${packages.length}: ${packageDimensions.length}"×${packageDimensions.width}"×${packageDimensions.height}", Girth+Length: ${finalGirth}", Weight: ${pkg.weight}lbs`);

        const response = await axios.post(
          'https://api.shipengine.com/v1/labels',
          labelPayload,
          {
            headers: {
              'API-Key': shipEngineApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const labelData = response.data;
        labels.push(labelData);

        packageResults.push({
          packageNumber: i + 1,
          weight: pkg.weight,
          items: pkg.items.length,
          dimensions: packageDimensions,
          labelId: labelData.label_id,
          trackingNumber: labelData.tracking_number,
          labelUrl: labelData.label_download?.pdf,
          success: true,
          description: packageDescription
        });

        console.log(`[DEBUG] Package ${i + 1} label created successfully: ${labelData.tracking_number}`);

      } catch (error) {
        console.error(`[ERROR] Package ${i + 1} label creation failed:`, error.response?.data || error.message);
        packageResults.push({
          packageNumber: i + 1,
          weight: pkg.weight,
          items: pkg.items.length,
          dimensions: packageDimensions,
          success: false,
          error: error.response?.data?.message || error.message,
          description: packageDescription
        });
      }

      // Small delay between API calls
      if (i < packages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successfulLabels = packageResults.filter(p => p.success).length;
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const totalItems = packages.reduce((sum, pkg) => sum + pkg.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    if (successfulLabels === 0) {
      throw new Error('Failed to create any shipping labels');
    }

    // For checkout compatibility, save multiple shipments to database
    const shipmentDocs = [];
    const successfulLabelsData = labels.filter((_, index) => packageResults[index].success);

    for (let i = 0; i < successfulLabelsData.length; i++) {
      const labelData = successfulLabelsData[i];
      const packageResult = packageResults.filter(p => p.success)[i];

      const shipmentData = {
        user: null, // Will be set by caller if needed
        status: labelData.status === 'completed' ? 'shipped' : labelData.status,
        shipping: {
          labelId: labelData.label_id,
          trackingNumber: labelData.tracking_number,
          shipmentId: labelData.shipment_id,
          shippingCost: {
            amount: labelData.shipment_cost?.amount || 0,
            currency: labelData.shipment_cost?.currency || 'usd',
          },
          insuranceCost: {
            amount: labelData.insurance_cost?.amount || 0,
            currency: labelData.insurance_cost?.currency || 'usd',
          },
          labelDownload: {
            href: labelData.label_download?.href || labelData.label_download?.pdf,
            pdf: labelData.label_download?.pdf,
            png: labelData.label_download?.png,
            zpl: labelData.label_download?.zpl,
          },
        },
        address: {
          title: 'Shipping Address',
          name: labelData.ship_to.name,
          addressLine1: labelData.ship_to.address_line1,
          addressLine2: labelData.ship_to.address_line2 || '',
          city: labelData.ship_to.city_locality,
          state: labelData.ship_to.state_province,
          country: labelData.ship_to.country_code,
          zipcode: labelData.ship_to.postal_code,
          contactNumber: labelData.ship_to.phone,
        },
        packageNumber: i + 1,
        totalPackages: successfulLabelsData.length,
      };

      shipmentDocs.push(shipmentData);
    }

    // Return format compatible with both direct API calls and checkout process
    const response = {
      message: `Successfully created ${successfulLabels} of ${packages.length} shipping labels`,
      labels: successfulLabelsData,
      packageInfo: {
        totalPackages: packages.length,
        successfulLabels,
        totalWeight,
        totalItems,
        warning: `Order split into ${packages.length} packages due to weight limit (${totalWeight}lbs total)`
      },
      packageDetails: packageResults,
      // For checkout compatibility - use first shipment as primary
      shipmentDetails: successfulLabelsData[0], // Primary label for checkout compatibility
      shipments: shipmentDocs, // All shipment data for database saving
      isMultiPackage: true
    };

    return response;

  } catch (error) {
    console.error('[ERROR] Multi-package label creation failed:', error);
    throw error;
  }
}

exports.calculateShippingRates = async (req, res) => {
  const { addressId, cartItems } = req.body;
  const userId = req.user._id;

  try {
    // Validate inputs
    if (!addressId || !mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: 'Valid address ID is required' });
    }
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Valid cart items are required' });
    }

    // Validate product IDs and filter to only existing products
    const productIds = cartItems
      .filter(item => mongoose.isValidObjectId(item.product?._id))
      .map(item => item.product._id);

    if (productIds.length === 0) {
      return res.status(400).json({ message: 'No valid product IDs provided' });
    }

    const products = await productModel.find({ _id: { $in: productIds } });

    // Log warning if some products were not found (deleted products)
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingIds = productIds.filter(id => !foundIds.includes(id.toString()));
      console.warn(`[WARNING] Some products in cart no longer exist: ${missingIds.join(', ')}`);
    }

    if (products.length === 0) {
      return res.status(400).json({ message: 'None of the cart products exist in the database' });
    }

    // Fetch user and address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(400).json({
        message: 'Address not found',
        addresses: user.addresses.map(addr => ({
          _id: addr._id,
          title: addr.title,
          name: addr.name,
          addressLine1: addr.addressLine1,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          zipcode: addr.zipcode,
          isDefault: addr.isDefault,
        })),
        providedAddressId: addressId,
      });
    }

    // Filter cart items to only include products that exist in the database
    const validProductIds = products.map(p => p._id.toString());
    const validCartItems = cartItems.filter(item =>
      validProductIds.includes(item.product._id.toString())
    );

    // Calculate total weight with fallback and minimum
    const MIN_WEIGHT_PER_ITEM = 0.5; // Minimum weight per item in pounds (USPS minimum threshold)
    const totalWeight = validCartItems.reduce((total, item) => {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      // Use product weight if available and reasonable (> 0.1 lbs), otherwise use minimum
      let weight = product?.weight && product.weight >= 0.1 ? product.weight : MIN_WEIGHT_PER_ITEM;
      // Ensure minimum weight per item for USPS
      weight = Math.max(weight, MIN_WEIGHT_PER_ITEM);
      if (item.quantity && item.quantity > 0) {
        return total + weight * item.quantity;
      }
      return total;
    }, 0);

    if (totalWeight <= 0) {
      return res.status(400).json({ message: 'Total weight must be greater than zero' });
    }

    // Check if we need multiple packages due to weight limit
    const MAX_WEIGHT_PER_PACKAGE = 70; // USPS weight limit in pounds

    if (totalWeight > MAX_WEIGHT_PER_PACKAGE) {
      console.log(`[DEBUG] Order weight (${totalWeight}lbs) exceeds 70lb limit. Creating multiple packages.`);
      return await handleWeightBasedMultiplePackages(validCartItems, products, address, userId, res);
    }

    console.log(`[DEBUG] Single package order: ${totalWeight}lbs (under 70lb limit)`);

    // Calculate smart single package dimensions that comply with USPS limits
    // USPS Priority Mail Express limit: Length + Girth ≤ 108 inches
    // Girth = 2 × (Width + Height)

    const MAX_GIRTH_PLUS_LENGTH = 108; // USPS limit
    const MAX_ITEMS_PER_ORDER = 500; // Reasonable limit for e-commerce orders

    // Check for extremely large orders
    if (validCartItems.length > MAX_ITEMS_PER_ORDER) {
      return res.status(400).json({
        message: `Order too large. Maximum ${MAX_ITEMS_PER_ORDER} items allowed per order. Please split into multiple orders.`,
        currentItems: validCartItems.length,
        maxAllowed: MAX_ITEMS_PER_ORDER
      });
    }

    // Calculate smart dimensions for single package
    let maxLength = 8;  // Start with reasonable minimum
    let maxWidth = 6;   // Start with reasonable minimum
    let calculatedHeight = 2; // Start with minimum

    // Find the largest individual item dimensions
    validCartItems.forEach(item => {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
      const length = Math.max(parseFloat(dimensions.length) || 8, 8);
      const width = Math.max(parseFloat(dimensions.width) || 6, 6);
      const height = Math.max(parseFloat(dimensions.height) || 2, 2);

      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
    });

    // Calculate height based on total items with smart stacking
    // Assume items can be efficiently packed with some compression
    const totalItemVolume = validCartItems.reduce((volume, item) => {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
      const height = Math.max(parseFloat(dimensions.height) || 2, 2);
      return volume + (height * item.quantity * 0.7); // 70% packing efficiency
    }, 0);

    // Calculate height based on volume and max base dimensions
    calculatedHeight = totalItemVolume / (maxLength * maxWidth) * (maxLength * maxWidth) / (maxLength * maxWidth);
    calculatedHeight = Math.max(calculatedHeight, totalItemVolume / 50); // Minimum density
    calculatedHeight = Math.max(calculatedHeight, 3); // Minimum 3 inches height
    calculatedHeight = Math.min(calculatedHeight, 20); // Maximum 20 inches height

    // Ensure girth compliance: Length + 2*(Width + Height) ≤ 108
    let attempts = 0;
    while (attempts < 10) {
      const currentGirth = maxLength + 2 * (maxWidth + calculatedHeight);

      if (currentGirth <= MAX_GIRTH_PLUS_LENGTH) {
        break; // We're good!
      }

      // Scale down proportionally
      const scaleFactor = (MAX_GIRTH_PLUS_LENGTH * 0.95) / currentGirth; // 95% of limit for safety
      maxLength *= scaleFactor;
      maxWidth *= scaleFactor;
      calculatedHeight *= scaleFactor;

      // Ensure minimums
      maxLength = Math.max(maxLength, 8);
      maxWidth = Math.max(maxWidth, 6);
      calculatedHeight = Math.max(calculatedHeight, 2);

      attempts++;
    }

    const finalDimensions = {
      length: Math.round(maxLength * 100) / 100,
      width: Math.round(maxWidth * 100) / 100,
      height: Math.round(calculatedHeight * 100) / 100,
    };

    const finalGirth = finalDimensions.length + 2 * (finalDimensions.width + finalDimensions.height);
    console.log(`[DEBUG] Final package: ${finalDimensions.length}" x ${finalDimensions.width}" x ${finalDimensions.height}", Girth+Length: ${finalGirth}", Weight: ${totalWeight}lbs`);

    // Normalize country code
    const countryCode = address.country === 'India' || address.country === 'West India' ? 'IN' :
      address.country === 'Bangladesh' ? 'BD' :
        address.country === 'USA' ? 'US' : address.country;

    // ShipEngine payload with single optimized package
    const payload = {
      shipment: {
        ship_to: {
          name: address.name,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2 || '',
          city_locality: address.city,
          state_province: address.state,
          postal_code: address.zipcode,
          country_code: countryCode,
          phone: address.contactNumber || '1234567890',
        },
        ship_from: {
          name: 'Your Warehouse',
          address_line1: '123 Warehouse St',
          city_locality: 'Warehouse City',
          state_province: 'CA',
          postal_code: '12345',
          country_code: 'US',
          phone: '9876543210',
        },
        packages: [
          {
            weight: { value: totalWeight, unit: 'pound' },
            dimensions: {
              length: finalDimensions.length,
              width: finalDimensions.width,
              height: finalDimensions.height,
              unit: 'inch',
            },
          },
        ],
      },
      rate_options: {
        carrier_ids: ['se-3136166'],
        package_types: ['package'], // Using 'package' instead of 'flat_rate_envelope'
        service_codes: ['usps_priority_mail_express'],
        calculate_tax_amount: false,
        preferred_currency: 'usd',
        rate_type: 'check',
      },
    };

    console.log('Payload sent to ShipEngine:', JSON.stringify(payload, null, 2));

    // Fetch shipping rates with timeout based on order size
    const timeoutMs = Math.max(30000, cartItems.length * 100); // 100ms per item, minimum 30 seconds
    console.log(`[DEBUG] Using ${timeoutMs}ms timeout for ${cartItems.length} items`);

    const response = await axios.post(
      'https://api.shipengine.com/v1/rates',
      payload,
      {
        headers: {
          'API-Key': process.env.SHIPENGINE_API_KEY || 'your-api-key',
        },
        timeout: timeoutMs,
      }
    );

    // Process shipping rates from single package
    const allRates = response?.data?.rate_response?.rates || [];

    if (allRates.length === 0) {
      return res.status(400).json({
        message: 'No shipping rates available for this shipment',
        totalWeight: totalWeight,
        totalItems: cartItems.length,
        dimensions: finalDimensions
      });
    }

    const shippingRates = allRates.map((rate) => ({
      carrier: rate?.carrier_friendly_name || 'Unknown Carrier',
      service: rate?.service_type || 'Unknown Service',
      estimatedDelivery: rate?.estimated_delivery_days || 'N/A',
      cost: rate?.shipping_amount?.amount || 0,
      currency: rate?.shipping_amount?.currency || 'USD',
    }));

    // Add warning for large orders
    const warningMessage = cartItems.length > 50 ?
      `Large order with ${cartItems.length} items packed as single shipment.` :
      null;

    res.status(200).json({
      shippingRates,
      packageInfo: {
        totalPackages: 1,
        totalWeight: totalWeight,
        totalItems: cartItems.length,
        dimensions: finalDimensions,
        warning: warningMessage
      }
    });
  } catch (error) {
    console.error('Error fetching shipping rates:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      cartItemsCount: cartItems?.length || 0,
    });

    // Specific error handling for common ShipEngine errors
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || 'Invalid shipping request parameters';
      console.error('ShipEngine validation error:', error.response?.data);
      return res.status(400).json({
        message: errorMessage,
        details: error.response?.data?.errors || []
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to calculate shipping rates',
      cartItemsCount: cartItems?.length || 0,
    });
  }
};



// ----------------latest12112--------



// exports.createShippingLabel = async (req, res) => {
//   const { addressId, cartItems, serviceCode = 'usps_priority_mail_express', orderId } = req.body;
//   const userId = req.user._id;

// console.log("req.body:", req.body);

//   try {
//     // Validate inputs
//     if (!addressId || !mongoose.isValidObjectId(addressId)) {
//       return res.status(400).json({ message: 'Valid address ID is required' });
//     }
//     if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
//       return res.status(400).json({ message: 'Valid cart items are required' });
//     }


//     // Validate API key
//     const shipEngineApiKey = process.env.SHIPENGINE_API_KEY;
//     if (!shipEngineApiKey) {
//       console.error('ShipEngine API key is missing');
//       return res.status(500).json({ message: 'Server configuration error: ShipEngine API key is missing' });
//     }

//     // Validate product IDs
//     const productIds = cartItems.map(item => {
//       if (!mongoose.isValidObjectId(item.product?._id)) {
//         throw new Error(`Invalid product ID: ${item.product?._id}`);
//       }
//       return item.product._id;
//     });
//     const products = await productModel.find({ _id: { $in: productIds } });
//     if (products.length !== productIds.length) {
//       return res.status(400).json({ message: 'One or more product IDs are invalid' });
//     }

//     // Fetch user and address
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const address = user.addresses.id(addressId);
//     if (!address) {
//       return res.status(400).json({
//         message: 'Address not found',
//         addresses: user.addresses.map(addr => ({
//           _id: addr._id,
//           title: addr.title,
//           name: addr.name,
//           addressLine1: addr.addressLine1,
//           addressLine2: addr.addressLine2,
//           city: addr.city,
//           state: addr.state,
//           country: addr.country,
//           zipcode: addr.zipcode,
//           isDefault: addr.isDefault,
//         })),
//         providedAddressId: addressId,
//       });
//     }

//     // Normalize address fields
//     const normalizedAddress = {
//       name: address.name?.trim() || 'Unknown',
//       address_line1: address.addressLine1?.trim() || '',
//       address_line2: address.addressLine2?.trim() || '',
//       city_locality: address.city?.trim() || '',
//       state_province: address.state?.trim()?.toUpperCase() || '',
//       postal_code: address.zipcode?.trim() || '94043-1351',
//       country_code: address.country?.trim()?.toUpperCase() === 'USA' ? 'US' : 'US',
//       phone: address.contactNumber?.trim() || '+1-212-736-3100',
//     };

//     // Log address for debugging
//     console.log('Normalized address from DB:', JSON.stringify(normalizedAddress, null, 2));

//     // Calculate total weight and insured value
//     const totalWeight = cartItems.reduce((total, item) => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       const weight = product?.weight && product.weight > 0 ? product.weight : 0.016;
//       return item.quantity && item.quantity > 0 ? total + weight * item.quantity : total;
//     }, 0);

//     if (totalWeight <= 0) {
//       return res.status(400).json({ message: 'Total weight must be greater than zero' });
//     }

//     const totalInsuredValue = cartItems.reduce((total, item) => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       const price = product?.buyPrice && product.buyPrice > 0 ? product.buyPrice : 29.99;
//       return item.quantity && item.quantity > 0 ? total + price * item.quantity : total;
//     }, 0);

//     // Calculate combined dimensions
//     const combinedDimensions = cartItems.reduce(
//       (dims, item) => {
//         const product = products.find(p => p._id.toString() === item.product._id.toString());
//         const dimensions = product?.dimensions || { length: 10, width: 5, height: 2 };
//         const length = parseFloat(dimensions.length) > 0 ? parseFloat(dimensions.length) : 10;
//         const width = parseFloat(dimensions.width) > 0 ? parseFloat(dimensions.width) : 5;
//         const height = parseFloat(dimensions.height) > 0 ? parseFloat(dimensions.height) : 2;
//         return {
//           length: Math.max(dims.length, length),
//           width: Math.max(dims.width, width),
//           height: dims.height + height,
//         };
//       },
//       { length: 0, width: 0, height: 0 }
//     );

//     const finalDimensions = {
//       length: Math.max(combinedDimensions.length, 1),
//       width: Math.max(combinedDimensions.width, 1),
//       height: Math.max(combinedDimensions.height, 1),
//       unit: 'inch',
//     };

//     if (finalDimensions.length <= 0 || finalDimensions.width <= 0 || finalDimensions.height <= 0) {
//       return res.status(400).json({ message: 'Invalid dimensions for one or more items' });
//     }

//     // Product description for package
//     const productDescriptions = cartItems.map(item => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       return `Product: ${product?.name || 'Unknown'}, Quantity: ${item.quantity}`;
//     }).join('; ');

//     // Fetch available carriers
//     let carrierId = 'se-1376009';
//     try {
//       const carriersResponse = await axios.get('https://api.shipengine.com/v1/carriers', {
//         headers: {
//           'API-Key': shipEngineApiKey,
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'User-Agent': 'YourApp/1.0',
//         },
//       });
//       const carriers = carriersResponse.data.carriers;
//       if (!carriers.some(carrier => carrier.carrier_id === carrierId)) {
//         console.warn(`Carrier ID ${carrierId} not found, selecting first available carrier`);
//         carrierId = carriers[0]?.carrier_id || carrierId;
//       }
//     } catch (carrierError) {
//       console.error('Error fetching carriers:', {
//         message: carrierError.message,
//         response: carrierError.response?.data,
//         status: carrierError.response?.status,
//       });
//     }

//     // ShipEngine payload for label creation
//     const payload = {
//       shipment: {
//         carrier_id: carrierId,
//         service_code: serviceCode,
//         ship_from: {
//           name: 'Your Warehouse',
//           address_line1: '123 Warehouse St',
//           city_locality: 'Warehouse City',
//           state_province: 'CA',
//           postal_code: '12345',
//           country_code: 'US',
//           phone: '9876543210',
//         },
//         ship_to: normalizedAddress,
//         packages: [
//           {
//             weight: { value: totalWeight, unit: 'pound' },
//             dimensions: finalDimensions,
//             description: productDescriptions,
//             insured_value: {
//               currency: 'usd',
//               amount: totalInsuredValue,
//             },
//           },
//         ],
//       },
//     };

//     console.log('Payload sent to ShipEngine for label:', JSON.stringify(payload, null, 2));

//     // Create shipping label
//     let response;
//     try {
//       response = await axios.post(
//         'https://api.shipengine.com/v1/labels',
//         payload,
//         {
//           headers: {
//             'API-Key': shipEngineApiKey,
//             'Content-Type': 'application/json',
//             'Accept': 'application/json',
//             'User-Agent': 'YourApp/1.0',
//           },
//           timeout: 10000,
//         }
//       );
//       console.log('ShipEngine label creation response:', JSON.stringify(response.data, null, 2));
//     } catch (apiError) {
//       if (apiError.response?.status === 400 && serviceCode === 'usps_priority_mail_express') {
//         console.log('Retrying with alternative service code: usps_first_class_mail');
//         payload.shipment.service_code = 'usps_first_class_mail';
//         try {
//           response = await axios.post(
//             'https://api.shipengine.com/v1/labels',
//             payload,
//             {
//               headers: {
//                 'API-Key': shipEngineApiKey,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 'User-Agent': 'YourApp/1.0',
//               },
//               timeout: 10000,
//             }
//           );
//           console.log('Retry ShipEngine label creation response:', JSON.stringify(response.data, null, 2));
//         } catch (retryError) {
//           console.error('Retry ShipEngine API error:', {
//             message: retryError.message,
//             response: retryError.response?.data,
//             status: retryError.response?.status,
//             headers: retryError.response?.headers,
//           });
//           return res.status(retryError.response?.status || 500).json({
//             message: retryError.response?.data?.message || 'Failed to create shipping label with retry',
//             validationErrors: retryError.response?.data?.errors || [{ message: retryError.message }],
//             address: payload.shipment.ship_to,
//           });
//         }
//       } else {
//         console.error('ShipEngine API error:', {
//           message: apiError.message,
//           response: apiError.response?.data,
//           status: apiError.response?.status,
//           headers: apiError.response?.headers,
//         });
//         return res.status(apiError.response?.status || 500).json({
//           message: apiError.response?.data?.message || 'Failed to create shipping label',
//           validationErrors: apiError.response?.data?.errors || [{ message: apiError.message }],
//           address: payload.shipment.ship_to,
//         });
//       }
//     }

//     if (!response.data?.label_id) {
//       console.error('ShipEngine response missing label_id:', JSON.stringify(response.data, null, 2));
//       return res.status(500).json({
//         message: 'Failed to create shipping label: No label ID returned',
//         validationErrors: [],
//         address: payload.shipment.ship_to,
//       });
//     }

//     // Save shipment details to ShipmentModel
//     const shipmentData = {
//       user: userId,
//       orderId: orderId || new mongoose.Types.ObjectId().toString(), // Fixed: Added 'new' for ObjectId
//       status: response.data.status === 'completed' ? 'shipped' : response.data.status,
//       shipping: {
//         labelId: response.data.label_id,
//         trackingNumber: response.data.tracking_number,
//         shipmentId: response.data.shipment_id,
//         shippingCost: {
//           amount: response.data.shipment_cost?.amount || 0,
//           currency: response.data.shipment_cost?.currency || 'usd',
//         },
//         insuranceCost: {
//           amount: response.data.insurance_cost?.amount || 0,
//           currency: response.data.insurance_cost?.currency || 'usd',
//         },
//         labelDownload: {
//           href: response.data.label_download?.href || response.data.label_download?.pdf,
//           pdf: response.data.label_download?.pdf,
//           png: response.data.label_download?.png,
//           zpl: response.data.label_download?.zpl,
//         },
//       },
//       address: {
//         title: address.title?.trim() || 'Default Address',
//         name: response.data.ship_to.name,
//         addressLine1: response.data.ship_to.address_line1,
//         addressLine2: response.data.ship_to.address_line2 || '',
//         city: response.data.ship_to.city_locality,
//         state: response.data.ship_to.state_province,
//         country: response.data.ship_to.country_code,
//         zipcode: response.data.ship_to.postal_code,
//         contactNumber: response.data.ship_to.phone,
//       },
//       shipFrom: payload.shipment.ship_from,
//       productDetails: cartItems.map(item => {
//         const product = products.find(p => p._id.toString() === item.product._id.toString());
//         return {
//           name: product?.name || 'Unknown',
//           quantity: item.quantity,
//           price: product?.buyPrice || 29.99,
//         };
//       }),
//       createdAt: response.data.created_at,
//       trackingUrl: response.data.tracking_url,
//     };

//     try {
//       const newShipment = new shipmentModel(shipmentData);
//       await newShipment.save();
//       console.log('Type of shipmentId:', typeof newShipment._id);
//     } catch (validationError) {
//       console.error('Shipment validation error:', {
//         message: validationError.message,
//         errors: validationError.errors,
//       });
//       return res.status(400).json({
//         message: 'Failed to save shipment to database',
//         validationErrors: validationError.errors ? Object.values(validationError.errors).map(e => ({
//           message: e.message,
//           path: e.path,
//         })) : [{ message: validationError.message }],
//         shipmentData,
//       });
//     }

//     res.status(200).json({
//       shipmentDetails: response.data,
//       productDetails: shipmentData.productDetails,
//     });
//   } catch (error) {
//     console.error('Error creating shipping label:', {
//       message: error.message,
//       stack: error.stack,
//       response: error.response?.data,
//       status: error.response?.status,
//     });
//     res.status(error.response?.status || 500).json({
//       message: error.response?.data?.message || 'Failed to create shipping label',
//       validationErrors: error.response?.data?.errors || [{ message: error.message }],
//       address: error.response?.data?.address || null,
//     });
//   }
// };





// exports.createShippingLabel = async (req, res) => {
//   const { addressId, cartItems, serviceCode = 'usps_priority_mail_express' } = req.body;
//   const userId = req.user._id;

//   console.log("req.body:", req.body);

//   try {
//     // Validate inputs
//     if (!addressId || !mongoose.isValidObjectId(addressId)) {
//       return res.status(400).json({ message: 'Valid address ID is required' });
//     }
//     if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
//       return res.status(400).json({ message: 'Valid cart items are required' });
//     }

//     // Validate API key
//     const shipEngineApiKey = process.env.SHIPENGINE_API_KEY;
//     if (!shipEngineApiKey) {
//       console.error('ShipEngine API key is missing');
//       return res.status(500).json({ message: 'Server configuration error: ShipEngine API key is missing' });
//     }

//     // Validate product IDs
//     const productIds = cartItems.map(item => {
//       if (!mongoose.isValidObjectId(item.product?._id)) {
//         throw new Error(`Invalid product ID: ${item.product?._id}`);
//       }
//       return item.product._id;
//     });
//     const products = await productModel.find({ _id: { $in: productIds } });
//     if (products.length !== productIds.length) {
//       return res.status(400).json({ message: 'One or more product IDs are invalid' });
//     }

//     // Fetch user and address
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const address = user.addresses.id(addressId);
//     if (!address) {
//       return res.status(400).json({
//         message: 'Address not found',
//         addresses: user.addresses.map(addr => ({
//           _id: addr._id,
//           title: addr.title,
//           name: addr.name,
//           addressLine1: addr.addressLine1,
//           addressLine2: addr.addressLine2,
//           city: addr.city,
//           state: addr.state,
//           country: addr.country,
//           zipcode: addr.zipcode,
//           isDefault: addr.isDefault,
//         })),
//         providedAddressId: addressId,
//       });
//     }

//     // Normalize address fields
//     const normalizedAddress = {
//       name: address.name?.trim() || 'Unknown',
//       address_line1: address.addressLine1?.trim() || '',
//       address_line2: address.addressLine2?.trim() || '',
//       city_locality: address.city?.trim() || '',
//       state_province: address.state?.trim()?.toUpperCase() || '',
//       postal_code: address.zipcode?.trim() || '94043-1351',
//       country_code: address.country?.trim()?.toUpperCase() === 'USA' ? 'US' : 'US',
//       phone: address.contactNumber?.trim() || '+1-212-736-3100',
//     };

//     // Log address for debugging
//     console.log('Normalized address from DB:', JSON.stringify(normalizedAddress, null, 2));

//     // Calculate total weight and insured value
//     const totalWeight = cartItems.reduce((total, item) => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       const weight = product?.weight && product.weight > 0 ? product.weight : 0.016;
//       return item.quantity && item.quantity > 0 ? total + weight * item.quantity : total;
//     }, 0);

//     if (totalWeight <= 0) {
//       return res.status(400).json({ message: 'Total weight must be greater than zero' });
//     }

//     const totalInsuredValue = cartItems.reduce((total, item) => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       const price = product?.buyPrice && product.buyPrice > 0 ? product.buyPrice : 29.99;
//       return item.quantity && item.quantity > 0 ? total + price * item.quantity : total;
//     }, 0);

//     // Calculate combined dimensions
//     const combinedDimensions = cartItems.reduce(
//       (dims, item) => {
//         const product = products.find(p => p._id.toString() === item.product._id.toString());
//         const dimensions = product?.dimensions || { length: 10, width: 5, height: 2 };
//         const length = parseFloat(dimensions.length) > 0 ? parseFloat(dimensions.length) : 10;
//         const width = parseFloat(dimensions.width) > 0 ? parseFloat(dimensions.width) : 5;
//         const height = parseFloat(dimensions.height) > 0 ? parseFloat(dimensions.height) : 2;
//         return {
//           length: Math.max(dims.length, length),
//           width: Math.max(dims.width, width),
//           height: dims.height + height,
//         };
//       },
//       { length: 0, width: 0, height: 0 }
//     );

//     const finalDimensions = {
//       length: Math.max(combinedDimensions.length, 1),
//       width: Math.max(combinedDimensions.width, 1),
//       height: Math.max(combinedDimensions.height, 1),
//       unit: 'inch',
//     };

//     if (finalDimensions.length <= 0 || finalDimensions.width <= 0 || finalDimensions.height <= 0) {
//       return res.status(400).json({ message: 'Invalid dimensions for one or more items' });
//     }

//     // Product description for package
//     const productDescriptions = cartItems.map(item => {
//       const product = products.find(p => p._id.toString() === item.product._id.toString());
//       return `Product: ${product?.name || 'Unknown'}, Quantity: ${item.quantity}`;
//     }).join('; ');

//     // Fetch available carriers
//     let carrierId = 'se-1376009';
//     try {
//       const carriersResponse = await axios.get('https://api.shipengine.com/v1/carriers', {
//         headers: {
//           'API-Key': shipEngineApiKey,
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'User-Agent': 'YourApp/1.0',
//         },
//       });
//       const carriers = carriersResponse.data.carriers;
//       if (!carriers.some(carrier => carrier.carrier_id === carrierId)) {
//         console.warn(`Carrier ID ${carrierId} not found, selecting first available carrier`);
//         carrierId = carriers[0]?.carrier_id || carrierId;
//       }
//     } catch (carrierError) {
//       console.error('Error fetching carriers:', {
//         message: carrierError.message,
//         response: carrierError.response?.data,
//         status: carrierError.response?.status,
//       });
//     }

//     // ShipEngine payload for label creation
//     const payload = {
//       shipment: {
//         carrier_id: carrierId,
//         service_code: serviceCode,
//         ship_from: {
//           name: 'Your Warehouse',
//           address_line1: '123 Warehouse St',
//           city_locality: 'Warehouse City',
//           state_province: 'CA',
//           postal_code: '12345',
//           country_code: 'US',
//           phone: '9876543210',
//         },
//         ship_to: normalizedAddress,
//         packages: [
//           {
//             weight: { value: totalWeight, unit: 'pound' },
//             dimensions: finalDimensions,
//             description: productDescriptions,
//             insured_value: {
//               currency: 'usd',
//               amount: totalInsuredValue,
//             },
//           },
//         ],
//       },
//     };

//     console.log('Payload sent to ShipEngine for label:', JSON.stringify(payload, null, 2));

//     // Create shipping label
//     let response;
//     try {
//       response = await axios.post(
//         'https://api.shipengine.com/v1/labels',
//         payload,
//         {
//           headers: {
//             'API-Key': shipEngineApiKey,
//             'Content-Type': 'application/json',
//             'Accept': 'application/json',
//             'User-Agent': 'YourApp/1.0',
//           },
//           timeout: 10000,
//         }
//       );
//       console.log('ShipEngine label creation response:', JSON.stringify(response.data, null, 2));
//     } catch (apiError) {
//       if (apiError.response?.status === 400 && serviceCode === 'usps_priority_mail_express') {
//         console.log('Retrying with alternative service code: usps_first_class_mail');
//         payload.shipment.service_code = 'usps_first_class_mail';
//         try {
//           response = await axios.post(
//             'https://api.shipengine.com/v1/labels',
//             payload,
//             {
//               headers: {
//                 'API-Key': shipEngineApiKey,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 'User-Agent': 'YourApp/1.0',
//               },
//               timeout: 10000,
//             }
//           );
//           console.log('Retry ShipEngine label creation response:', JSON.stringify(response.data, null, 2));
//         } catch (retryError) {
//           console.error('Retry ShipEngine API error:', {
//             message: retryError.message,
//             response: retryError.response?.data,
//             status: retryError.response?.status,
//             headers: retryError.response?.headers,
//           });
//           return res.status(retryError.response?.status || 500).json({
//             message: retryError.response?.data?.message || 'Failed to create shipping label with retry',
//             validationErrors: retryError.response?.data?.errors || [{ message: retryError.message }],
//             address: payload.shipment.ship_to,
//           });
//         }
//       } else {
//         console.error('ShipEngine API error:', {
//           message: apiError.message,
//           response: apiError.response?.data,
//           status: apiError.response?.status,
//           headers: apiError.response?.headers,
//         });
//         return res.status(apiError.response?.status || 500).json({
//           message: apiError.response?.data?.message || 'Failed to create shipping label',
//           validationErrors: apiError.response?.data?.errors || [{ message: apiError.message }],
//           address: payload.shipment.ship_to,
//         });
//       }
//     }

//     if (!response.data?.label_id) {
//       console.error('ShipEngine response missing label_id:', JSON.stringify(response.data, null, 2));
//       return res.status(500).json({
//         message: 'Failed to create shipping label: No label ID returned',
//         validationErrors: [],
//         address: payload.shipment.ship_to,
//       });
//     }

//     // Generate or use provided orderId
//     const finalOrderId = orderId 

//     // Save shipment details to ShipmentModel
//     const shipmentData = {
//       user: userId,
//       orderId: finalOrderId,
//       status: response.data.status === 'completed' ? 'shipped' : response.data.status,
//       shipping: {
//         labelId: response.data.label_id,
//         trackingNumber: response.data.tracking_number,
//         shipmentId: response.data.shipment_id,
//         shippingCost: {
//           amount: response.data.shipment_cost?.amount || 0,
//           currency: response.data.shipment_cost?.currency || 'usd',
//         },
//         insuranceCost: {
//           amount: response.data.insurance_cost?.amount || 0,
//           currency: response.data.insurance_cost?.currency || 'usd',
//         },
//         labelDownload: {
//           href: response.data.label_download?.href || response.data.label_download?.pdf,
//           pdf: response.data.label_download?.pdf,
//           png: response.data.label_download?.png,
//           zpl: response.data.label_download?.zpl,
//         },
//       },
//       address: {
//         title: address.title?.trim() || 'Default Address',
//         name: response.data.ship_to.name,
//         addressLine1: response.data.ship_to.address_line1,
//         addressLine2: response.data.ship_to.address_line2 || '',
//         city: response.data.ship_to.city_locality,
//         state: response.data.ship_to.state_province,
//         country: response.data.ship_to.country_code,
//         zipcode: response.data.ship_to.postal_code,
//         contactNumber: response.data.ship_to.phone,
//       },
//       shipFrom: payload.shipment.ship_from,
//       productDetails: cartItems.map(item => {
//         const product = products.find(p => p._id.toString() === item.product._id.toString());
//         return {
//           name: product?.name || 'Unknown',
//           quantity: item.quantity,
//           price: product?.buyPrice || 29.99,
//         };
//       }),
//       createdAt: response.data.created_at,
//       trackingUrl: response.data.tracking_url,
//     };

//     try {
//       const newShipment = new shipmentModel(shipmentData);
//       await newShipment.save();
//       console.log('Type of shipmentId:', typeof newShipment._id);
//     } catch (validationError) {
//       console.error('Shipment validation error:', {
//         message: validationError.message,
//         errors: validationError.errors,
//       });
//       return res.status(400).json({
//         message: 'Failed to save shipment to database',
//         validationErrors: validationError.errors ? Object.values(validationError.errors).map(e => ({
//           message: e.message,
//           path: e.path,
//         })) : [{ message: validationError.message }],
//         shipmentData,
//       });
//     }

//     // Log response for debugging
//     console.log('[DEBUG] Shipping label created:', {
//       shipmentDetails: {
//         label_id: response.data.label_id,
//         tracking_number: response.data.tracking_number,
//         label_download: response.data.label_download,
//       },
//       productDetails: shipmentData.productDetails,
//       orderId: finalOrderId,
//     });

//     // Return response with orderId
//     res.status(200).json({
//       shipmentDetails: response.data,
//       productDetails: shipmentData.productDetails,
//       orderId: finalOrderId, // Include orderId in response
//     });
//   } catch (error) {
//     console.error('Error creating shipping label:', {
//       message: error.message,
//       stack: error.stack,
//       response: error.response?.data,
//       status: error.response?.status,
//     });
//     res.status(error.response?.status || 500).json({
//       message: error.response?.data?.message || 'Failed to create shipping label',
//       validationErrors: error.response?.data?.errors || [{ message: error.message }],
//       address: error.response?.data?.address || null,
//     });
//   }
// };



// Helper function to generate shipping label using ShipEngine
const generateShippingLabelInternal = async (userId, addressId, cartItems, websiteRole, serviceCode = 'usps_priority_mail_express', orderId = null) => {
  try {
    // Validate API key
    const shipEngineApiKey = process.env.SHIPENGINE_API_KEY;
    if (!shipEngineApiKey) {
      return { success: false, status: 500, message: 'Server configuration error: ShipEngine API key is missing' };
    }

    // Validate product IDs and filter to only existing products
    const productIds = cartItems
      .filter(item => mongoose.isValidObjectId(item.product?._id || item.productId))
      .map(item => item.product?._id || item.productId);

    if (productIds.length === 0) {
      return { success: false, status: 400, message: 'No valid product IDs provided' };
    }

    const products = await productModel.find({ _id: { $in: productIds } });

    if (products.length === 0) {
      return { success: false, status: 400, message: 'None of the cart products exist in the database' };
    }

    // Filter cart items to only include products that exist
    const validProductIds = products.map(p => p._id.toString());
    const validCartItems = cartItems.filter(item =>
      validProductIds.includes((item.product?._id || item.productId).toString())
    );

    // Fetch user and address
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return { success: false, status: 400, message: 'Address not found' };
    }

    // Normalize address fields
    const normalizedAddress = {
      name: address.name?.trim() || 'Unknown',
      address_line1: address.addressLine1?.trim() || '',
      address_line2: address.addressLine2?.trim() || '',
      city_locality: address.city?.trim() || '',
      state_province: address.state?.trim()?.toUpperCase() || '',
      postal_code: address.zipcode?.trim() || '94043-1351',
      country_code: address.country?.trim()?.toUpperCase() === 'USA' ? 'US' : 'US',
      phone: address.contactNumber?.trim() || '+1-212-736-3100',
    };

    // Calculate total weight and insured value
    const MIN_WEIGHT_PER_ITEM = 0.5;
    const totalWeight = validCartItems.reduce((total, item) => {
      const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
      let weight = product?.weight && product.weight >= 0.1 ? product.weight : MIN_WEIGHT_PER_ITEM;
      weight = Math.max(weight, MIN_WEIGHT_PER_ITEM);
      return item.quantity && item.quantity > 0 ? total + weight * item.quantity : total;
    }, 0);

    if (totalWeight <= 0) {
      return { success: false, status: 400, message: 'Total weight must be greater than zero' };
    }

    // Handle heavy orders (>70lbs)
    const MAX_WEIGHT_PER_PACKAGE = 70;
    if (totalWeight > MAX_WEIGHT_PER_PACKAGE) {
      try {
        const multiPackageResult = await handleWeightBasedMultiplePackagesForLabels(validCartItems, products, normalizedAddress, serviceCode, shipEngineApiKey);
        if (multiPackageResult.isMultiPackage && multiPackageResult.shipments) {
          const savedShipments = [];
          for (const shipmentData of multiPackageResult.shipments) {
            shipmentData.user = userId;
            shipmentData.orderId = orderId;

            // Ensure shipping defaults are present if missing from helper
            if (!shipmentData.shipping.insuranceCost) {
              shipmentData.shipping.insuranceCost = { amount: 0, currency: 'usd' };
            } else {
              shipmentData.shipping.insuranceCost.amount = Number(shipmentData.shipping.insuranceCost.amount || 0);
              shipmentData.shipping.insuranceCost.currency = String(shipmentData.shipping.insuranceCost.currency || 'usd');
            }
            if (!shipmentData.shipping.shippingCost) {
              shipmentData.shipping.shippingCost = { amount: 0, currency: 'usd' };
            } else {
              shipmentData.shipping.shippingCost.amount = Number(shipmentData.shipping.shippingCost.amount || 0);
              shipmentData.shipping.shippingCost.currency = String(shipmentData.shipping.shippingCost.currency || 'usd');
            }

            shipmentData.productDetails = validCartItems.map(item => {
              const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
              return {
                productId: product?._id,
                name: product?.name || 'Unknown',
                quantity: item.quantity,
                price: product?.buyPrice || 29.99,
                createdBy: product?.createdBy || 'admin',
                creatorRole: websiteRole
              };
            });
            const newShipment = new shipmentModel(shipmentData);
            await newShipment.save();
            savedShipments.push(newShipment);
          }
          multiPackageResult.savedShipments = savedShipments;
          multiPackageResult.primaryShipmentId = savedShipments[0]?._id;
          return { success: true, ...multiPackageResult, shipmentId: savedShipments[0]?._id };
        }
      } catch (error) {
        return { success: false, status: 500, message: 'Failed to create multi-package labels', error: error.message };
      }
    }

    const totalInsuredValue = validCartItems.reduce((total, item) => {
      const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
      const price = product?.buyPrice && product.buyPrice > 0 ? product.buyPrice : 29.99;
      return item.quantity && item.quantity > 0 ? total + price * item.quantity : total;
    }, 0);

    // Dimensions calculation
    let maxLength = 8, maxWidth = 6, calculatedHeight = 2;
    validCartItems.forEach(item => {
      const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
      const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
      maxLength = Math.max(maxLength, Math.max(parseFloat(dimensions.length) || 8, 8));
      maxWidth = Math.max(maxWidth, Math.max(parseFloat(dimensions.width) || 6, 6));
    });

    const totalItemVolume = validCartItems.reduce((volume, item) => {
      const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
      const dimensions = product?.dimensions || { length: 8, width: 6, height: 2 };
      const height = Math.max(parseFloat(dimensions.height) || 2, 2);
      return volume + (height * item.quantity * 0.7);
    }, 0);

    calculatedHeight = Math.max(totalItemVolume / (maxLength * maxWidth), 3);
    calculatedHeight = Math.min(calculatedHeight, 15);

    const finalDimensions = {
      length: Math.round(maxLength * 100) / 100,
      width: Math.round(maxWidth * 100) / 100,
      height: Math.round(calculatedHeight * 100) / 100,
      unit: 'inch',
    };

    const payload = {
      shipment: {
        carrier_id: 'se-3136166',
        service_code: serviceCode,
        ship_from: {
          name: 'Your Warehouse',
          address_line1: '123 Warehouse St',
          city_locality: 'Warehouse City',
          state_province: 'CA',
          postal_code: '12345',
          country_code: 'US',
          phone: '9876543210',
        },
        ship_to: normalizedAddress,
        packages: [{
          weight: { value: totalWeight, unit: 'pound' },
          dimensions: finalDimensions,
          description: validCartItems.map(item => {
            const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
            return `${product?.name || 'Unknown'} x${item.quantity}`;
          }).join('; '),
          insured_value: { currency: 'usd', amount: totalInsuredValue },
        }],
      },
    };

    let response = await axios.post('https://api.shipengine.com/v1/labels', payload, {
      headers: { 'API-Key': shipEngineApiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 15000,
    });

    console.log('[DEBUG] ShipEngine label response:', JSON.stringify(response.data, null, 2));

    if (!response.data?.label_id) {
      return { success: false, status: 500, message: 'No label ID returned from ShipEngine' };
    }

    const shipmentData = {
      user: userId,
      orderId: orderId,
      status: response.data.status === 'completed' ? 'shipped' : response.data.status,
      shipping: {
        labelId: response.data.label_id,
        trackingNumber: response.data.tracking_number,
        shipmentId: response.data.shipment_id,
        shippingCost: {
          amount: Number(response.data.shipment_cost?.amount || 0),
          currency: String(response.data.shipment_cost?.currency || 'usd')
        },
        insuranceCost: {
          amount: Number(response.data.insurance_cost?.amount || 0),
          currency: String(response.data.insurance_cost?.currency || 'usd')
        },
        labelDownload: {
          href: response.data.label_download?.href || response.data.label_download?.pdf,
          pdf: response.data.label_download?.pdf,
        },
      },
      address: {
        title: address.title || 'Shipping Address',
        name: response.data.ship_to.name,
        addressLine1: response.data.ship_to.address_line1,
        addressLine2: response.data.ship_to.address_line2 || '',
        city: response.data.ship_to.city_locality,
        state: response.data.ship_to.state_province,
        country: response.data.ship_to.country_code,
        zipcode: response.data.ship_to.postal_code,
        contactNumber: response.data.ship_to.phone,
      },
      productDetails: validCartItems.map(item => {
        const product = products.find(p => p._id.toString() === (item.product?._id || item.productId).toString());
        return {
          productId: product?._id,
          name: product?.name || 'Unknown',
          quantity: item.quantity,
          price: product?.buyPrice || 29.99,
          createdBy: product?.createdBy || 'admin',
          creatorRole: websiteRole
        };
      }),
      trackingUrl: response.data.tracking_url,
    };

    console.log('[DEBUG] Final shipmentData before save:', JSON.stringify(shipmentData, null, 2));
    const newShipment = new shipmentModel(shipmentData);
    await newShipment.save();
    logger.info('Shipment saved successfully');

    return { success: true, shipmentDetails: response.data, productDetails: shipmentData.productDetails, shipmentId: newShipment._id, shipment: newShipment };
  } catch (error) {
    console.error('Error in generateShippingLabelInternal:', error.response?.data || error.message);
    return {
      success: false,
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'Failed to generate label',
      validationErrors: error.response?.data?.errors || []
    };
  }
};

exports.createShippingLabel = async (req, res) => {
  const { addressId, cartItems, serviceCode = 'usps_priority_mail_express', orderId = null } = req.body;
  const userId = req.user._id;

  try {
    const result = await generateShippingLabelInternal(userId, addressId, cartItems, serviceCode, orderId);
    if (!result.success) {
      return res.status(result.status).json({
        message: result.message,
        validationErrors: result.validationErrors,
        address: result.address
      });
    }

    res.status(200).json({
      shipmentDetails: result.shipmentDetails,
      productDetails: result.productDetails,
      shipmentId: result.shipmentId
    });
  } catch (error) {
    console.error('Error in createShippingLabel:', error);
    res.status(500).json({ message: error.message || 'Failed to create shipping label' });
  }
};





// exports.createCheckoutSession = async (req, res) => {
//   console.log('[DEBUG] ===== NEW VERSION CREATE CHECKOUT SESSION CALLED =====');
//   console.log('[DEBUG] Request method:', req.method);
//   console.log('[DEBUG] Request URL:', req.originalUrl);

//   const userId = req.user._id;
//   const { addressId, shippingCost, shipEngineLabelId, cartItems, userType } = req.body;

//   console.log("Request body:", JSON.stringify(req.body, null, 2));
//   console.log('[DEBUG] Extracted userType from request body:', userType);
//   console.log('[DEBUG] userType type:', typeof userType);
//   console.log('[DEBUG] userType === "retailer":', userType === 'retailer');

//   try {
//     // Validate environment variables
//     if (!process.env.FRONTEND_URL || !/^(https?:\/\/)/.test(process.env.FRONTEND_URL)) {
//       console.error("Invalid FRONTEND_URL:", process.env.FRONTEND_URL);
//       return res.status(500).json({ message: "Server configuration error: Invalid FRONTEND_URL" });
//     }

//     // Validate user role
//     if (req.user.role !== "user") {
//       return res.status(403).json({ message: "Only users can create checkout sessions" });
//     }

//     // Validate inputs
//     if (!addressId || !mongoose.isValidObjectId(addressId)) {
//       return res.status(400).json({ message: "Valid shipping address ID is required" });
//     }

//     if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
//       return res.status(400).json({ message: "Valid cart items are required" });
//     }

//     if (typeof shippingCost !== "number" || shippingCost < 0) {
//       return res.status(400).json({ message: "Valid shipping cost is required" });
//     }

//     // Fetch user and address
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const address = user.addresses.id(addressId);
//     if (!address) {
//       return res.status(400).json({ message: "Invalid or unauthorized address" });
//     }

//     // Validate products
//     const productIds = cartItems.map((item) => item.product._id);
//     const products = await productModel.find({ _id: { $in: productIds } });
//     if (products.length !== productIds.length) {
//       return res.status(400).json({ message: "One or more product IDs are invalid" });
//     }

//     // Create line items
//     const lineItems = cartItems.map((item) => {
//       const product = products.find((p) => p._id.toString() === item.product._id.toString());
//       if (!product || !product.name || !product.buyPrice) {
//         throw new Error(`Invalid product data for product ID: ${item.product._id}`);
//       }

//       let imageUrl = [];
//       if (product.images?.[0]) {
//         const imagePath = product.images[0].replace(/\\/g, "/");
//         const fullUrl = `${process.env.BASE_URL}/${imagePath.startsWith("/") ? imagePath.slice(1) : imagePath}`;
//         console.log("Constructed image URL:", fullUrl); // Debug image URL
//         try {
//           const url = new URL(fullUrl);
//           if (url.protocol === "https:") {
//             imageUrl = [fullUrl];
//           } else {
//             console.warn(`Non-HTTPS image URL for product ${product.name}: ${fullUrl}`);
//           }
//         } catch (e) {
//           console.warn(`Invalid image URL for product ${product.name}: ${fullUrl}`);
//         }
//       }

//       return {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: product.name,
//             images: imageUrl,
//           },
//           unit_amount: Math.round(product.buyPrice * 100),
//         },
//         quantity: item.quantity,
//       };
//     });

//     // Add shipping cost as a line item
//     if (shippingCost > 0) {
//       lineItems.push({
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: "Shipping Cost (USPS Priority Mail Express)",
//           },
//           unit_amount: Math.round(shippingCost * 100),
//         },
//         quantity: 1,
//       });
//     }

//     console.log("Line items for Stripe session:", JSON.stringify(lineItems, null, 2));

//     // Determine success/cancel URLs based on user type from body or request headers
//     const origin = req.get('origin') || '';
//     const referer = req.get('referer') || '';

//     console.log('[DEBUG] Origin header:', origin);
//     console.log('[DEBUG] Referer header:', referer);
//     console.log('[DEBUG] User type from request body:', userType);
//     console.log('[DEBUG] User type from req.body.userType:', req.body.userType);
//     logger.info('User type resolved');

//     const isRetailerByHeader = /retailer-wholesaler-website\.netlify\.app/i.test(origin) || /retailer-wholesaler-website\.netlify\.app/i.test(referer);
//     console.log('[DEBUG] Determined isRetailerByHeader:', isRetailerByHeader);

//     // Simplified logic - prioritize explicit userType parameter
//     const isRetailerUser = (userType === 'retailer' || req.body.userType === 'retailer' || isRetailerByHeader);
//     console.log('[DEBUG] Is retailer user (final):', isRetailerUser);

//     const baseSuccessUrl = isRetailerUser
//       ? 'https://retailer-wholesaler-website.netlify.app'
//       : 'https://user-wholesaler.netlify.app';

//     console.log('[DEBUG] Selected base URL:', baseSuccessUrl);

//     const dynamicSuccessUrl = `${baseSuccessUrl}/purchase-summary?session_id={CHECKOUT_SESSION_ID}`;
//     const cancelUrl = `${baseSuccessUrl}/cart`;

//     console.log('[DEBUG] Final URLs - Success:', dynamicSuccessUrl, 'Cancel:', cancelUrl);

//     // Validate URLs
//     console.log("Stripe session URLs:", { successUrl: dynamicSuccessUrl, cancelUrl });
//     try {
//       new URL(dynamicSuccessUrl.split("?")[0]);
//       new URL(cancelUrl);
//     } catch (e) {
//       console.error("Invalid URL detected:", { successUrl: dynamicSuccessUrl, cancelUrl, error: e.message });
//       return res.status(500).json({ message: "Invalid success or cancel URL" });
//     }

//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: lineItems,
//       mode: "payment",
//       success_url: dynamicSuccessUrl,
//       cancel_url: cancelUrl,
//       customer_email: req.user.email,
//       metadata: {
//         userId: userId.toString(),
//         addressId: addressId.toString(),
//         shipEngineLabelId: shipEngineLabelId || "",
//         cartItems: JSON.stringify(cartItems),
//         shippingCost: shippingCost.toString(),
//         userType: isRetailerUser ? 'retailer' : 'wholesaler',
//       },
//     });

//     console.log(
//       "Stripe session created:",
//       JSON.stringify(
//         {
//           sessionId: session.id,
//           totalAmount: session.amount_total / 100,
//           currency: session.currency,
//         },
//         null,
//         2
//       )
//     );

//     res.status(200).json({ sessionId: session.id, url: session.url });
//   } catch (error) {
//     console.error("Error creating checkout session:", error);
//     let errorMessage = error.message || "Failed to create checkout session";
//     res.status(500).json({ message: errorMessage });
//   }
// };

exports.createCheckoutSession = async (req, res) => {
  console.log('[DEBUG] ===== NEW VERSION CREATE CHECKOUT SESSION CALLED =====');
  console.log('[DEBUG] Request method:', req.method);
  console.log('[DEBUG] Request URL:', req.originalUrl);

  const userId = req.user._id;
  const { addressId, shippingCost, shipEngineLabelId, cartItems, userType, websiteRole } = req.body;

  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log('[DEBUG] Extracted userType from request body:', userType);
  logger.info('websiteRole extracted from request');
  console.log('[DEBUG] userType type:', typeof userType);
  console.log('[DEBUG] userType === "retailer":', userType === 'retailer');

  try {
    // Validate environment variables
    if (!process.env.FRONTEND_URL || !/^(https?:\/\/)/.test(process.env.FRONTEND_URL)) {
      console.error("Invalid FRONTEND_URL:", process.env.FRONTEND_URL);
      return res.status(500).json({ message: "Server configuration error: Invalid FRONTEND_URL" });
    }

    // Validate user role
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can create checkout sessions" });
    }

    // Validate inputs
    if (!addressId || !mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Valid shipping address ID is required" });
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Valid cart items are required" });
    }

    if (typeof shippingCost !== "number" || shippingCost < 0) {
      return res.status(400).json({ message: "Valid shipping cost is required" });
    }

    // Fetch user and address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(400).json({ message: "Invalid or unauthorized address" });
    }

    // Validate products - filter out any that don't exist
    const productIds = cartItems
      .filter(item => mongoose.isValidObjectId(item.product?._id))
      .map((item) => item.product._id);

    if (productIds.length === 0) {
      return res.status(400).json({ message: "No valid product IDs provided" });
    }

    const products = await productModel.find({ _id: { $in: productIds } });

    // Log warning if some products were not found (deleted products)
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingIds = productIds.filter(id => !foundIds.includes(id.toString()));
      console.warn(`[WARNING] Some products in cart no longer exist: ${missingIds.join(', ')}`);
    }

    if (products.length === 0) {
      return res.status(400).json({ message: "None of the cart products exist in the database" });
    }

    // Filter cart items to only include products that exist
    const validProductIds = products.map(p => p._id.toString());
    const validCartItems = cartItems.filter(item =>
      validProductIds.includes(item.product._id.toString())
    );

    // Create line items
    const lineItems = validCartItems.map((item) => {
      const product = products.find((p) => p._id.toString() === item.product._id.toString());
      if (!product || !product.name) {
        throw new Error(`Invalid product data for product ID: ${item.product._id}`);
      }

      // Determine the price: variant price > product sellPrice > product buyPrice > first variant price
      let itemPrice = 0;
      if (item.variantId && product.variants) {
        const variant = product.variants.find(v => v._id.toString() === item.variantId);
        if (variant && variant.price) {
          itemPrice = variant.price;
        }
      }
      // Fallback to product prices
      if (!itemPrice) {
        itemPrice = product.sellPrice || product.buyPrice || (product.variants?.[0]?.price) || 0;
      }

      if (!itemPrice || itemPrice <= 0) {
        throw new Error(`Invalid product data for product ID: ${item.product._id} - no price available`);
      }

      let imageUrl = [];
      if (product.images?.[0]) {
        const imagePath = product.images[0].replace(/\\/g, "/");
        const fullUrl = `${process.env.BASE_URL}/${imagePath.startsWith("/") ? imagePath.slice(1) : imagePath}`;
        console.log("Constructed image URL:", fullUrl); // Debug image URL
        try {
          const url = new URL(fullUrl);
          if (url.protocol === "https:") {
            imageUrl = [fullUrl];
          } else {
            console.warn(`Non-HTTPS image URL for product ${product.name}: ${fullUrl}`);
          }
        } catch (e) {
          console.warn(`Invalid image URL for product ${product.name}: ${fullUrl}`);
        }
      }

      // Build product display name with variant if available
      let displayName = product.name;
      if (item.variantId && product.variants) {
        const variant = product.variants.find(v => v._id.toString() === item.variantId);
        if (variant && variant.variantName) {
          displayName = `${product.name} - ${variant.variantName}`;
        }
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: displayName,
            images: imageUrl,
          },
          unit_amount: Math.round(itemPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add shipping cost as a line item
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping Cost (USPS Priority Mail Express)",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    console.log("Line items for Stripe session:", JSON.stringify(lineItems, null, 2));

    // Determine success/cancel URLs based on user type from body or request headers
    const origin = req.get('origin') || '';
    const referer = req.get('referer') || '';

    console.log('[DEBUG] Origin header:', origin);
    console.log('[DEBUG] Referer header:', referer);
    console.log('[DEBUG] User type from request body:', userType);
    console.log('[DEBUG] User type from req.body.userType:', req.body.userType);
    logger.info('User type resolved');

    // Check if running locally
    const isLocalhost = /localhost/i.test(origin) || /localhost/i.test(referer);
    console.log('[DEBUG] Is localhost:', isLocalhost);

    const isRetailerByHeader = /rayshealthyliving\.com/i.test(origin) || /rayshealthyliving\.com/i.test(referer);
    console.log('[DEBUG] Determined isRetailerByHeader:', isRetailerByHeader);

    // Simplified logic - prioritize explicit userType parameter
    const isRetailerUser = (userType === 'retailer' || req.body.userType === 'retailer' || isRetailerByHeader);
    console.log('[DEBUG] Is retailer user (final):', isRetailerUser);

    // For localhost, use the origin directly; otherwise use production URLs
    let baseSuccessUrl;
    if (isLocalhost) {
      // Extract port from origin if present, default to 5173 for Vite
      baseSuccessUrl = origin || 'http://localhost:5173';
    } else {
      baseSuccessUrl = isRetailerUser
        ? 'https://rayshealthyliving.com'
        : 'http://rayonewholesale.com';
    }

    console.log('[DEBUG] Selected base URL:', baseSuccessUrl);

    const dynamicSuccessUrl = `${baseSuccessUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseSuccessUrl}/cart`;

    console.log('[DEBUG] Final URLs - Success:', dynamicSuccessUrl, 'Cancel:', cancelUrl);

    // Validate URLs
    console.log("Stripe session URLs:", { successUrl: dynamicSuccessUrl, cancelUrl });
    try {
      new URL(dynamicSuccessUrl.split("?")[0]);
      new URL(cancelUrl);
    } catch (e) {
      console.error("Invalid URL detected:", { successUrl: dynamicSuccessUrl, cancelUrl, error: e.message });
      return res.status(500).json({ message: "Invalid success or cancel URL" });
    }

    // Create Stripe checkout session
    // Instead of storing full cartItems in metadata (which has 500 char limit), 
    // we'll store a temporary cart ID and retrieve cart from user's cart
    const tempCartId = `temp_${Date.now()}_${userId}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: dynamicSuccessUrl,
      cancel_url: cancelUrl,
      customer_email: req.user.email,
      metadata: {
        userId: userId.toString(),
        addressId: addressId.toString(),
        shipEngineLabelId: shipEngineLabelId || "",
        tempCartId: tempCartId,
        shippingCost: shippingCost.toString(),
        userType: isRetailerUser ? 'retailer' : 'wholesaler',
        websiteRole: websiteRole || (isRetailerUser ? 'retailer' : 'wholesaler'),
        cartItemCount: validCartItems.length.toString(),
      },
    });

    console.log(
      "Stripe session created:",
      JSON.stringify(
        {
          sessionId: session.id,
          totalAmount: session.amount_total / 100,
          currency: session.currency,
        },
        null,
        2
      )
    );

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    let errorMessage = error.message || "Failed to create checkout session";
    res.status(500).json({ message: errorMessage });
  }
};

// Internal helper to finalize an order after successful payment
async function finalizeOrderInternal(sessionId, userId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata || !session.metadata.userId || session.metadata.userId !== userId.toString()) {
      console.error('[finalizeOrder] Metadata mismatch. session.metadata.userId:', session.metadata?.userId, 'userId:', userId.toString());
      throw new Error('Unauthorized access to payment session');
    }

    const result = {
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent,
    };

    if (session.payment_status === 'succeeded' || session.payment_status === 'paid') {
      const { addressId, websiteRole: metadataWebsiteRole, userType, shippingCost: metadataShippingCost } = session.metadata;
      const websiteRole = metadataWebsiteRole || userType || 'retailer';

      // Check if purchase already exists
      let purchase = await purchaseModel.findOne({ purchaseId: sessionId })
        .populate('shipment')
        .populate('items.product')
        .populate('user', 'name email');

      if (purchase) {
        logger.info('finalizeOrder: purchase already exists');

        // Ensure address is attached as full object (not just ObjectId)
        if (addressId) {
          const user = await User.findById(userId).lean();
          const address = user.addresses.find(addr => addr._id.toString() === addressId.toString());
          if (address) purchase.address = address;
        }

        return {
          success: true,
          ...result,
          purchase: purchase,
          shipmentDetails: purchase.shipment,
          productDetails: purchase.shipment?.productDetails || purchase.items.map(item => ({
            name: item.product?.name || 'Unknown Product',
            price: item.price,
            quantity: item.quantity,
            createdBy: item.product?.createdBy || 'admin',
            creatorRole: item.websiteRole || websiteRole
          }))
        };
      }

      // Fetch line items from Stripe
      let allLineItems = [];
      let hasMore = true;
      let startingAfter = null;
      while (hasMore) {
        const lineItemsResponse = await stripe.checkout.sessions.listLineItems(sessionId, {
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter })
        });
        allLineItems = allLineItems.concat(lineItemsResponse.data);
        hasMore = lineItemsResponse.has_more;
        if (hasMore && lineItemsResponse.data.length > 0) {
          startingAfter = lineItemsResponse.data[lineItemsResponse.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }

      const parsedCartItems = [];
      let shippingCost = metadataShippingCost ? parseFloat(metadataShippingCost) : 0;

      for (const lineItem of allLineItems) {
        const productName = lineItem.description;
        if (productName && productName.toLowerCase().includes('shipping')) {
          if (!shippingCost) shippingCost = (lineItem.amount_total || 0) / 100;
          continue;
        }
        const product = await productModel.findOne({
          name: { $regex: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        });
        if (product) {
          parsedCartItems.push({
            product: product._id,
            productId: product._id,
            name: product.name,
            buyPrice: product.buyPrice,
            quantity: lineItem.quantity || 1,
            weight: product.weight,
            dimensions: product.dimensions,
            createdBy: product.createdBy
          });
        } else {
          console.warn('[finalizeOrder] Product not found in DB:', productName);
        }
      }

      // Generate shipping label
      const orderId = session.metadata.orderId || `ORDER-${Date.now()}`;
      const shippingResult = await generateShippingLabelInternal(userId, addressId, parsedCartItems, websiteRole, 'usps_priority_mail_express', orderId);

      let shipmentId = null;
      if (shippingResult.success) {
        shipmentId = shippingResult.shipmentId;
        result.shipmentDetails = shippingResult.shipmentDetails;
        result.productDetails = shippingResult.productDetails;
        console.log('[finalizeOrder] Shipping label created:', shipmentId);
      } else {
        console.error('[finalizeOrder] Shipping label failed:', shippingResult.message);
      }

      // Create Purchase record
      const total = (session.amount_total || 0) / 100;
      purchase = new purchaseModel({
        user: userId,
        items: parsedCartItems.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.buyPrice,
          websiteRole: websiteRole
        })),
        total,
        shippingCost: shippingCost,
        purchaseId: sessionId,
        paymentIntentId: session.payment_intent,
        address: addressId,
        shipment: shipmentId,
        status: 'completed',
      });
      await purchase.save();
      logger.info('finalizeOrder: purchase saved');

      // Clear cart for this websiteRole
      const cart = await cartModel.findOne({ user: userId });
      if (cart) {
        cart.items = cart.items.filter(item => item.websiteRole !== websiteRole);
        await cart.save();
      }

      const finalPopulatedPurchase = await purchaseModel.findById(purchase._id)
        .populate('shipment')
        .populate('items.product')
        .populate('user', 'name email')
        .lean();

      // Attach full address object
      const user = await User.findById(userId).lean();
      const address = user.addresses.find(addr => addr._id.toString() === addressId.toString());
      if (address) finalPopulatedPurchase.address = address;

      result.purchase = finalPopulatedPurchase;

      // Build productDetails from items if not set by shipping label
      if (!result.productDetails) {
        result.productDetails = finalPopulatedPurchase.items.map(item => ({
          productId: item.product?._id || item.product,
          name: item.product?.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity,
          createdBy: item.product?.createdBy,
          creatorRole: websiteRole
        }));
      }

      return { success: true, ...result };
    } else {
      console.log('[finalizeOrder] Payment not ready. Status:', session.payment_status);
      return result;
    }
  } catch (error) {
    console.error('[finalizeOrder] FAILED:', error.message);
    throw error;
  }
}

exports.checkPayment = async (req, res) => {
  const { id: sessionId } = req.params; // The route defines it as /purchase/:id
  const userId = req.user._id;

  try {
    const result = await finalizeOrderInternal(sessionId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('[ERROR] checkPayment:', error);
    res.status(500).json({ message: error.message || 'Failed to check payment status' });
  }
};




exports.createCheckoutAndShipment = async (req, res) => {
  const { addressId, cartItems, shippingCost, orderId, userType } = req.body;
  const userId = req.user._id;

  console.log('[DEBUG] createCheckoutAndShipment - userType from request:', userType);

  // console.log('[DEBUG] createCheckoutAndShipment request body:', {
  //   addressId,
  //   cartItems: cartItems.map(item => ({
  //     productId: item.productId,
  //     name: item.name,
  //     quantity: item.quantity,
  //     buyPrice: item.buyPrice,
  //     weight: item.weight,
  //     dimensions: item.dimensions,
  //   })),
  //   shippingCost,
  //   orderId,
  //   userId,
  // });

  try {
    // Validate inputs
    if (!addressId || !mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: 'Valid address ID is required' });
    }
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Valid cart items are required' });
    }
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate address
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(400).json({
        message: 'Address not found',
        addresses: user.addresses.map(addr => ({
          _id: addr._id,
          title: addr.title,
          name: addr.name,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          zipcode: addr.zipcode,
          isDefault: addr.isDefault,
        })),
        providedAddressId: addressId,
      });
    }

    // Validate products
    const productIds = cartItems.map(item => {
      if (!mongoose.isValidObjectId(item.productId)) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      return item.productId;
    });
    const products = await productModel.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more product IDs are invalid' });
    }

    // Create Stripe checkout session
    const lineItems = cartItems.map(item => {
      const product = products.find(p => p._id.toString() === item.productId);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name || 'Unnamed Product',
          },
          unit_amount: Math.round((item.buyPrice || 0) * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping (USPS Priority Mail Express)',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Determine success URL based on user type or request parameter
    const isRetailerUser = req.body.userType === 'retailer' || req.user.userType === 'retailer';
    const baseSuccessUrl = isRetailerUser
      ? 'https://rayshealthyliving.com'
      : 'http://rayonewholesale.com';

    const dynamicSuccessUrl = `${baseSuccessUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/cart`;

    console.log('[DEBUG] createCheckoutAndShipment - User type from request:', req.body.userType);
    logger.info('createCheckoutAndShipment: user type resolved');
    console.log('[DEBUG] createCheckoutAndShipment - Is retailer user:', isRetailerUser);
    console.log('[DEBUG] createCheckoutAndShipment - Using dynamic success URL:', dynamicSuccessUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: dynamicSuccessUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        addressId,
        tempCartId: `temp_${Date.now()}_${userId}`,
        orderId,
        shippingCost: shippingCost.toString(),
        userType: isRetailerUser ? 'retailer' : 'wholesaler',
        cartItemCount: cartItems.length.toString(),
      },
    });

    // console.log('[DEBUG] Stripe session created:', {
    //   sessionId: session.id,
    //   orderId,
    //   userId,
    // });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    // console.error('[ERROR] Error creating checkout session:', {
    //   message: error.message,
    //   stack: error.stack,
    // });
    res.status(500).json({
      message: error.message || 'Failed to create checkout session',
      validationErrors: [{ message: error.message }],
    });
  }
};




// Backend: /api/user/purchase/:orderId



exports.getPurchaseByIds = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    if (!purchaseId) {
      return res.status(400).json({ message: 'Purchase ID is required' });
    }

    const purchase = await purchaseModel.findById(purchaseId)
      .populate({
        path: 'user',
        select: 'name email phone role profileImage' // exclude password
      })
      .populate('items.product', 'name buyPrice images sku createdBy variants')
      .populate('shipment')
      .lean();


    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Add displayName with variant to each item
    const itemsWithDisplayName = purchase.items.map(item => {
      let displayName = item.product?.name || 'Unknown Product';
      if (item.variantName) {
        displayName = `${item.product?.name || 'Unknown Product'} - ${item.variantName}`;
      }
      return {
        ...item,
        displayName: displayName,
        product: item.product ? {
          ...item.product,
          displayName: displayName
        } : null
      };
    });

    res.status(200).json({ success: true, data: { ...purchase, items: itemsWithDisplayName } });

  } catch (err) {
    // console.error("Error in getPurchaseByIds:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



