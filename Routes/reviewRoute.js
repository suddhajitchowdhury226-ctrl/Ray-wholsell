const express = require('express');
const { createReview, getReviewByPurchase, getProductReviewsPublic } = require('../Controllers/reviewController');
const { protect, restrictTo } = require('../Middleware/tokenVerify');

const router = express.Router();

router.post('/', protect, restrictTo('user'), createReview);
router.get('/:purchaseId', protect, restrictTo('user'), getReviewByPurchase);
router.get('/product/:productId', getProductReviewsPublic);

module.exports = router;
