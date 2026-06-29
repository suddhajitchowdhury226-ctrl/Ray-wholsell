const express = require('express');
const { getUsersWithForms, deleteUser } = require('../Controllers/userController');
const { getRetailerPurchases, getCategories, getBrands, getRetailerCategories } = require('../Controllers/categoryController');
const { getWholesalerProducts, filterProducts, getProductCount, getSingleProduct, filterProductsByUser } = require('../Controllers/productController');
const { applyCoupon, createCoupon, getCoupons, getCoupon, updateCoupon, deleteCoupon, submitFeedback, createCounseling, getCounselings, deleteCounseling } = require('../Controllers/authController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');
const { getAllPurchases, purchaseSummary, createCheckoutSession, deleteCartItem, getCart, updateCartItem, addToCart, checkPayment, calculateShippingRates, createShippingLabel, createCheckoutAndShipment, getPurchaseByIds } = require('../Controllers/cartController');
const { createReview, getReviewByPurchase, getUserReviews, getAggregatedReviews } = require('../Controllers/reviewController');
const purchaseModel = require('../Models/purchaseModel');
const productModel = require('../Models/productModel');
const feedbackModel = require('../Models/feedbackModel');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require('mongoose').Types; // Ensure ObjectId is imported

const router = express.Router();

// Get all users with wholesaler form data — admin only
router.get('/users-with-forms', protect, restrictTo('admin'), getUsersWithForms);

router.delete('/delete-user/:id', protect, restrictTo('admin'), deleteUser);


router.get(
  "/get-products",
  protect,
  restrictTo("user"),
  filterProductsByUser
);
router.get(
  "/get-single-product/:productId",
  getSingleProduct
);
router.post("/add-to-cart", protect, restrictTo("user"), addToCart);
router.put("/update-cart", protect, restrictTo("user"), updateCartItem);

router.get("/get-cart", protect, restrictTo("user"), getCart);

router.delete("/delete-cart", protect, restrictTo("user"), deleteCartItem);


router.post(
  "/create-checkout-session",
  protect,
  restrictTo("user"),
  createCheckoutSession
);
router.get(
  "/purchase-summary",
  protect,
  restrictTo("user"),
  purchaseSummary
);
router.get(
  "/all-purchases",
  protect,
  restrictTo("user"),
  getAllPurchases
);



// Existing purchase routes
// router.get('/purchases', getRetailerPurchases);


router.get(
  '/purchases',
  protect,
  restrictTo('admin'),
  async (req, res) => {
    try {
      const purchases = await purchaseModel
        .find()
        .sort({ createdAt: -1 })
        .populate({
          path: 'items.product',
          select: 'name buyPrice images sku item_number bin_location brand',
          populate: {
            path: 'brand',
            select: 'name'
          }
        })
        .populate('user', 'name email')
        .populate('shipment', 'shipping status address productDetails trackingUrl createdAt')
       
        .lean();

      const populatedPurchases = purchases.map(purchase => {
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
        
        return {
          ...purchase,
          items: itemsWithDisplayName,
          address: purchase.address || null, // Address is already populated
          shipmentDetails: purchase.shipment || null,
        };
      });

      res.status(200).json({
        message: 'All purchases retrieved',
        purchases: populatedPurchases,
      });
    } catch (error) {
      console.error('[ERROR] getAllPurchases:', error);
      res.status(500).json({ message: 'Error fetching purchase history' });
    }
  }
);


router.get(
  "/retailer-categories",
 
  getRetailerCategories
);




router.get(
  "/purchase/:id",
  protect,
  restrictTo("user"),
  checkPayment
);

router.post(
  "/calculate-shipping-rates",
  protect,
  restrictTo("user"),
  calculateShippingRates
);

router.post(
  "/create-shipping-label",
  protect,
  restrictTo("user"),
  createShippingLabel
);

router.post(
  "/create-checkoutshipment",
  protect,
  restrictTo("user"),
  createCheckoutAndShipment
);


router.get('/get-purchases/:purchaseId', protect,
  restrictTo("user"), getPurchaseByIds);

router.post('/reviews', protect, restrictTo('user'), createReview);
router.get('/reviews/:purchaseId', protect, restrictTo('user'), getReviewByPurchase);
router.get('/my-reviews', protect, restrictTo('user'), getUserReviews);
router.get('/aggregated-reviews/:purchaseId', protect, restrictTo('user'), getAggregatedReviews);


  router.post(
  '/request-refund',
  protect,
  restrictTo('user'),
  async (req, res) => {
    try {
      const { purchaseId, refundReason } = req.body;
      const userId = req.user._id;

      console.log('Requesting refund for purchaseId:', purchaseId, 'by userId:', userId);

      // Validate purchaseId format
      if (!purchaseId) {
        console.log('No purchaseId provided');
        return res.status(400).json({ message: 'Purchase ID is required' });
      }
    

      console.log('Looking for purchase with ID:', purchaseId, 'and user ID:', userId);
      const purchase = await purchaseModel.findOne({
        _id: purchaseId,
        user: userId,
        status: 'completed',
      });

      if (!purchase) {
        console.log('Purchase not found or not eligible for refund:', { purchaseId, userId });
        return res.status(404).json({ message: 'Purchase not found or not eligible for refund' });
      }

      purchase.status = 'refund_requested';
      purchase.refundReason = refundReason;
      await purchase.save();

      res.status(200).json({ message: 'Refund request submitted successfully' });
    } catch (error) {
      console.error('[ERROR] requestRefund:', error);
      res.status(500).json({ message: 'Error submitting refund request' });
    }
  }
);

// Process a refund (admin only)
router.post(
  '/process-refund',
  protect,
  restrictTo('admin'),
  async (req, res) => {
    try {
      const { purchaseId, action } = req.body;

      console.log("=== REFUND PROCESSING START ===");
      console.log("Request body:", req.body);
      console.log("Looking for purchase with ID:", purchaseId, "and status: 'refund_requested'");

      const purchase = await purchaseModel.findOne({
        _id: purchaseId,
        status: 'refund_requested',
      });

      console.log("Query result - Purchase found:", !!purchase);
      
      if (purchase) {
        console.log("Found purchase:", {
          id: purchase._id,
          currentStatus: purchase.status,
          currentRefundStatus: purchase.refundStatus,
          paymentIntentId: purchase.paymentIntentId,
          total: purchase.total
        });
      } else {
        console.log("Purchase not found - checking if it exists at all...");
        const anyPurchase = await purchaseModel.findById(purchaseId);
        if (anyPurchase) {
          console.log("Purchase exists but doesn't match criteria:", {
            id: anyPurchase._id,
            status: anyPurchase.status,
            refundStatus: anyPurchase.refundStatus
          });
        } else {
          console.log("Purchase doesn't exist in database");
        }
      }

      if (!purchase) {
        return res.status(404).json({ message: 'Refund request not found or already processed' });
      }

      if (action === 'approve') {
        console.log("=== PROCESSING STRIPE REFUND ===");
        console.log("Payment Intent ID:", purchase.paymentIntentId);
        console.log("Refund Amount:", purchase.total, "($" + (purchase.total * 100) + " cents)");
        
        try {
          // Process refund through Stripe
          const refund = await stripe.refunds.create({
            payment_intent: purchase.paymentIntentId,
            amount: Math.round(purchase.total * 100), // Convert to cents
          });

          console.log('Stripe refund created successfully:', {
            refundId: refund.id,
            amount: refund.amount,
            status: refund.status
          });
          
          console.log("=== UPDATING PURCHASE STATUS ===");
          console.log("Before update:", {
            status: purchase.status,
            refundStatus: purchase.refundStatus
          });
          
          // Update purchase status to refunded
          purchase.status = 'refunded';
          purchase.refundStatus = 'processed';
          purchase.refundProcessedAt = new Date();
          purchase.stripeRefundId = refund.id;
          
          console.log("After update (before save):", {
            status: purchase.status,
            refundStatus: purchase.refundStatus,
            refundProcessedAt: purchase.refundProcessedAt,
            stripeRefundId: purchase.stripeRefundId
          });
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          return res.status(400).json({ 
            message: 'Failed to process refund through Stripe',
            error: stripeError.message 
          });
        }
      } else if (action === 'reject') {
        purchase.status = 'completed';
        purchase.refundStatus = 'rejected';
        purchase.refundRejectedAt = new Date();
        
        console.log('Updated purchase status to rejected:', {
          purchaseId: purchase._id,
          status: purchase.status,
          refundStatus: purchase.refundStatus
        });
      } else {
        return res.status(400).json({ message: 'Invalid action' });
      }

      console.log("=== SAVING PURCHASE ===");
      console.log("About to save purchase with:", {
        status: purchase.status,
        refundStatus: purchase.refundStatus,
        action: action
      });
      
      const savedPurchase = await purchase.save();
      
      console.log('Purchase saved successfully:', {
        purchaseId: savedPurchase._id,
        finalStatus: savedPurchase.status,
        finalRefundStatus: savedPurchase.refundStatus,
        action,
        updatedAt: savedPurchase.updatedAt
      });
      
      // Double-check by fetching the purchase again
      const verifyPurchase = await purchaseModel.findById(purchaseId);
      console.log("Verification - Purchase from DB after save:", {
        status: verifyPurchase.status,
        refundStatus: verifyPurchase.refundStatus,
        updatedAt: verifyPurchase.updatedAt
      });
      
      // Return detailed response
      const responseMessage = action === 'approve' 
        ? `Refund approved and processed successfully. Amount: $${purchase.total.toFixed(2)}`
        : `Refund request rejected successfully`;
        
      res.status(200).json({ 
        message: responseMessage,
        purchaseId: purchase._id,
        action,
        refundStatus: purchase.refundStatus,
        status: purchase.status,
        processedAt: action === 'approve' ? purchase.refundProcessedAt : purchase.refundRejectedAt
      });
    } catch (error) {
      console.error('[ERROR] processRefund:', {
        message: error.message,
        stack: error.stack,
        purchaseId: req.body.purchaseId,
        action: req.body.action
      });
      
      // Provide specific error messages
      let errorMessage = 'Error processing refund';
      if (error.message.includes('payment_intent')) {
        errorMessage = 'Invalid payment intent. This purchase may not be eligible for refund.';
      } else if (error.message.includes('Stripe')) {
        errorMessage = 'Payment processing error. Please try again later.';
      }
      
      res.status(500).json({ 
        message: errorMessage,
        details: error.message 
      });
    }
  }
);




// Public category and product endpoints for frontend
router.get('/categories', getCategories);
router.get('/filter-products', filterProducts);


router.get('/product-counts', async (req, res) => {
  try {
    // Aggregate product counts by category, subcategory, and brand
    const counts = await productModel.aggregate([
      // Match products where createdBy.role is "retailer"
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $match: {
          'creator.role': 'retailer'
        }
      },
      // Unwind creator array (from lookup)
      {
        $unwind: '$creator'
      },
      // Group by category, subcategory, and brand
      {
        $facet: {
          categoryCounts: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null categories
            }
          ],
          subcategoryCounts: [
            {
              $group: {
                _id: '$subcategory',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null subcategories
            }
          ],
          brandCounts: [
            {
              $group: {
                _id: '$brand',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null brands
            }
          ]
        }
      },
      // Format the output
      {
        $project: {
          categoryCounts: {
            $arrayToObject: {
              $map: {
                input: '$categoryCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          },
          subcategoryCounts: {
            $arrayToObject: {
              $map: {
                input: '$subcategoryCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          },
          brandCounts: {
            $arrayToObject: {
              $map: {
                input: '$brandCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          }
        }
      }
    ]);

    // Extract the first (and only) result from the facet
    const result = counts[0] || {
      categoryCounts: {},
      subcategoryCounts: {},
      brandCounts: {}
    };

    res.status(200).json({
      success: true,
      categoryCounts: result.categoryCounts,
      subcategoryCounts: result.subcategoryCounts,
      brandCounts: result.brandCounts
    });
  } catch (error) {
    console.error('Error fetching product counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product counts'
    });
  }
});


router.get('/product-count', async (req, res) => {
  try {
    // Aggregate product counts by category, subcategory, and brand for wholesalers
    const counts = await productModel.aggregate([
      // Match products where createdBy.role is "wholesaler"
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $match: {
          'creator.role': 'wholesaler'
        }
      },
      // Unwind creator array (from lookup)
      {
        $unwind: '$creator'
      },
      // Group by category, subcategory, and brand
      {
        $facet: {
          categoryCounts: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null categories
            }
          ],
          subcategoryCounts: [
            {
              $group: {
                _id: '$subcategory',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null subcategories
            }
          ],
          brandCounts: [
            {
              $group: {
                _id: '$brand',
                count: { $sum: 1 }
              }
            },
            {
              $match: { _id: { $ne: null } } // Exclude null brands
            }
          ]
        }
      },
      // Format the output
      {
        $project: {
          categoryCounts: {
            $arrayToObject: {
              $map: {
                input: '$categoryCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          },
          subcategoryCounts: {
            $arrayToObject: {
              $map: {
                input: '$subcategoryCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          },
          brandCounts: {
            $arrayToObject: {
              $map: {
                input: '$brandCounts',
                as: 'item',
                in: {
                  k: { $toString: '$$item._id' },
                  v: '$$item.count'
                }
              }
            }
          }
        }
      }
    ]);

    // Extract the first (and only) result from the facet
    const result = counts[0] || {
      categoryCounts: {},
      subcategoryCounts: {},
      brandCounts: {}
    };

    res.status(200).json({
      success: true,
      categoryCounts: result.categoryCounts,
      subcategoryCounts: result.subcategoryCounts,
      brandCounts: result.brandCounts
    });
  } catch (error) {
    console.error('Error fetching product counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product counts'
    });
  }
});




router.get('/categories-products', async (req, res) => {
  try {
    // Aggregate product counts by category for wholesalers
    const counts = await Product.aggregate([
      // Lookup to join with users collection to get creator role
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      // Match products where creator role is wholesaler
      {
        $match: {
          'creator.role': 'wholesaler'
        }
      },
      // Unwind creator array
      {
        $unwind: '$creator'
      },
      // Group by category to count products
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      // Exclude null categories
      {
        $match: { _id: { $ne: null } }
      },
      // Format as object with category ID as key
      {
        $project: {
          k: { $toString: '$_id' },
          v: '$count'
        }
      },
      {
        $group: {
          _id: null,
          categoryCounts: { $push: { k: '$k', v: '$v' } }
        }
      },
      {
        $project: {
          categoryCounts: { $arrayToObject: '$categoryCounts' }
        }
      }
    ]);

    // Extract category counts
    const categoryCounts = counts[0]?.categoryCounts || {};

    // Fetch all categories and populate subcategories
    const categories = await Category.find()
      .populate('subcategories', 'name _id')
      .lean();

    // Filter categories with non-zero product counts and sort A-Z
    const filteredCategories = categories
      .filter(category => categoryCounts[category._id] > 0)
      .map(category => ({
        _id: category._id,
        name: category.name,
        image: category.image,
        subcategories: category.subcategories || [],
        productCount: categoryCounts[category._id] || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Check if any categories are found
    if (filteredCategories.length === 0) {
      return res.status(200).json({
        success: true,
        categories: [],
        message: 'No categories with products found for wholesalers.'
      });
    }

    res.status(200).json({
      success: true,
      categories: filteredCategories
    });
  } catch (error) {
    console.error('Error fetching categories with products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories with products'
    });
  }
});

router.post('/feedback', submitFeedback);

router.get('/feedback', protect, restrictTo('admin'), async (req, res) => {
  try {
    const feedbacks = await feedbackModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/counselling', createCounseling);

router.get('/counselling', protect, restrictTo('admin'), getCounselings);

router.delete('/counselling/:id', protect, restrictTo('admin'), deleteCounseling);


router.get('/get-brands', getBrands);


router.post('/coupons',protect,restrictTo("admin"), createCoupon);
router.get('/get-coupon',protect, getCoupons);
router.get('/get-coupon/:id',protect, getCoupon);
router.put('/update-coupon/:id', protect,updateCoupon);
router.delete('/delete-coupon/:id',protect, deleteCoupon);

router.post('/apply',applyCoupon);


module.exports = router;