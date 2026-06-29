const Review = require('../Models/reviewModel');
const Purchase = require('../Models/purchaseModel');

exports.getRetailerProductsWithReviews = async (req, res) => {
  try {
    const retailerId = req.user._id;

    // Get reviews where createdBy matches the retailer ID
    const reviewStats = await Review.aggregate([
      {
        $match: { createdBy: retailerId }
      },
      {
        $group: {
          _id: '$purchaseId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    // Get purchase details for each purchaseId that has reviews
    const purchaseIds = reviewStats.map(stat => stat._id);
    const purchases = await Purchase.find({ 
      purchaseId: { $in: purchaseIds } 
    }).populate('items.product', 'name images');

    // Combine review stats with product information
    const productsWithReviews = [];
    
    reviewStats.forEach(stat => {
      const purchase = purchases.find(p => p.purchaseId === stat._id);
      if (purchase && purchase.items) {
        purchase.items.forEach(item => {
          if (item.product) {
            productsWithReviews.push({
              _id: item.product._id,
              name: item.product.name,
              images: item.product.images,
              purchaseId: stat._id,
              totalReviews: stat.totalReviews,
              averageRating: Math.round(stat.averageRating * 10) / 10
            });
          }
        });
      }
    });

    // Remove duplicates based on product _id
    const uniqueProducts = productsWithReviews.reduce((acc, current) => {
      const existing = acc.find(item => item._id.toString() === current._id.toString());
      if (existing) {
        existing.totalReviews += current.totalReviews;
        existing.averageRating = Math.round(((existing.averageRating + current.averageRating) / 2) * 10) / 10;
      } else {
        acc.push(current);
      }
      return acc;
    }, []);

    res.status(200).json({
      success: true,
      products: uniqueProducts
    });
  } catch (error) {
    console.error('Error fetching retailer products with reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products with reviews',
      error: error.message
    });
  }
};

exports.getRetailerProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const retailerId = req.user._id;

    // Find all purchases that contain this product
    const purchases = await Purchase.find({ 'items.product': productId });
    const purchaseIds = purchases.map(p => p.purchaseId);

    // Get all reviews for these purchases where createdBy matches retailer
    const reviews = await Review.find({ 
      purchaseId: { $in: purchaseIds },
      createdBy: retailerId
    })
    .populate('user', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 
        : 0
    });
  } catch (error) {
    console.error('Error fetching retailer product reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product reviews',
      error: error.message
    });
  }
};