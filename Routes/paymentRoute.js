const express = require('express');
const router = express.Router();
const { createPayment, executePayment, createAndConfirmPayment } = require('../Controllers/paymentController');

router.post('/create-payment', createPayment);
router.post('/execute', executePayment);

router.post('/create-and-confirm-payment',createAndConfirmPayment);

module.exports = router;