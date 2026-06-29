const Review = require('../Models/reviewModel');
const Purchase = require('../Models/purchaseModel');

// Drop old index on first load
let indexDropped = false;

exports.createReview = async (req, res) => {
  try {
    // Drop old indexes if not already done
    if (!indexDropped) {
      try {
        await Review.collection.dropIndex('user_1_product_1');
        console.log('Dropped old user_1_product_1 index');
      } catch (err) {
        console.log('user_1_product_1 index not found');
      }
      try {
        await Review.collection.dropIndex('product_1_user_1');
        console.log('Dropped old product_1_user_1 index');
      } catch (err) {
        console.log('product_1_user_1 index not found');
      }
      indexDropped = true;
    }

    const { purchaseId, rating, comment, websiteRole, createdBy } = req.body;
    const userId = req.user._id;

    // Check if review already exists
    const existingReview = await Review.findOne({ user: userId, purchaseId });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already exists for this purchase' });
    }

    const review = new Review({
      user: userId,
      purchaseId,
      rating,
      comment,
      websiteRole: websiteRole || 'wholesaler',
      createdBy: createdBy || null,
    });

    await review.save();
    res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewByPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOne({ user: userId, purchaseId });
    res.status(200).json({ review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const reviews = await Review.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAggregatedReviews = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const reviews = await Review.find({ purchaseId }).populate('user', 'name').sort({ createdAt: -1 });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;

    res.status(200).json({
      reviews,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductReviewsPublic = async (req, res) => {
  try {
    const { productId } = req.params;

    // Find all purchases that contain this product
    const purchases = await Purchase.find({ 'items.product': productId });

    // If no purchases found, return empty
    if (!purchases || purchases.length === 0) {
      return res.status(200).json({
        success: true,
        reviews: [],
        totalReviews: 0,
        averageRating: 0
      });
    }

    const purchaseIds = purchases.map(p => p.purchaseId);

    // Get all reviews for these purchases
    const reviews = await Review.find({
      purchaseId: { $in: purchaseIds }
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    res.status(200).json({
      success: true,
      reviews,
      totalReviews,
      averageRating
    });
  } catch (error) {
    console.error('Error fetching public product reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};