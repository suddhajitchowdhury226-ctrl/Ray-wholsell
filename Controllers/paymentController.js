const paypal = require('paypal-rest-sdk');
const appointmentModel = require('../Models/appointmentModel');

exports.createPayment = (req, res) => {
  const { amount } = req.body;

  const create_payment_json = {
    intent: 'sale',
    payer: { payment_method: 'paypal' },
    redirect_urls: {
      return_url: 'http://localhost:5173/success',
      cancel_url: 'http://localhost:5173/cancel'
    },
    transactions: [{
      item_list: {
        items: [{
          name: 'Nutrition Consultation',
          sku: 'consultation',
          price: amount.toString(),
          currency: 'USD',
          quantity: 1
        }]
      },
      amount: {
        currency: 'USD',
        total: amount.toString()
      },
      description: 'Payment for Nutrition Consultation'
    }]
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      console.error('PayPal create payment error:', error);
      return res.status(400).json({ error: error.message });
    }
    const approvalUrl = payment.links.find(link => link.rel === 'approval_url')?.href;
    if (!approvalUrl) {
      console.error('No approval URL found in PayPal response:', payment);
      return res.status(400).json({ error: 'No approval URL returned from PayPal' });
    }
    res.status(200).json({ approvalUrl, paymentId: payment.id });
  });
};


exports.executePayment = async (req, res) => {
  const { paymentId, payerId, bookingData } = req.body;

  if (!paymentId || !payerId || !bookingData) {
    console.error('Missing required fields:', { paymentId, payerId, bookingData });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check for existing booking
    const existingBooking = await appointmentModel.findOne({
      $or: [
        { paymentId },
        {
          email: bookingData.email,
          date: new Date(bookingData.date),
          selectedTime: bookingData.selectedTime,
          consultant: bookingData.consultant,
          service: bookingData.service,
        }
      ]
    });

    if (existingBooking) {
      console.log('Booking already exists:', existingBooking);
      return res.status(200).json({ booking: existingBooking });
    }

    const execute_payment_json = {
      payer_id: payerId
    };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error('PayPal execute payment error:', error);
        return res.status(400).json({ error: error.message });
      }
      try {
        const booking = new appointmentModel({
          ...bookingData,
          date: new Date(bookingData.date),
          paymentStatus: 'Completed',
          paymentId
        });
        await booking.save();
        console.log('Booking created:', booking);
        res.status(200).json({ booking, payment });
      } catch (error) {
        if (error.code === 11000) {
          const existing = await appointmentModel.findOne({
            email: bookingData.email,
            date: new Date(bookingData.date),
            selectedTime: bookingData.selectedTime,
            consultant: bookingData.consultant,
            service: bookingData.service,
          });
          console.log('Booking already exists:', existing);
          res.status(200).json({ booking: existing, payment });
        } else {
          console.error('Error creating booking:', error);
          res.status(400).json({ error: error.message });
        }
      }
    });
  } catch (error) {
    console.error('Error checking existing booking:', error);
    res.status(400).json({ error: error.message });
  }
};


exports.createAndConfirmPayment = async (req, res) => {
  const { bookingData, action } = req.body;

  if (action === 'create') {
    // Handle payment creation
    if (!bookingData) {
      console.error('Missing booking data');
      return res.status(400).json({ error: 'Missing booking data' });
    }

    try {
      // Check for existing booking
      const existingBooking = await appointmentModel.findOne({
        email: bookingData.email,
        date: new Date(bookingData.date),
        selectedTime: bookingData.selectedTime,
        consultant: bookingData.consultant,
        service: bookingData.service
      });

      if (existingBooking) {
        if (existingBooking.paymentStatus === 'Completed') {
          console.log('Booking already exists and completed:', existingBooking._id);
          return res.status(200).json({ booking: existingBooking });
        } else {
          // Update existing pending booking
          existingBooking.paypalOrderId = null; // Reset paypalOrderId
          await existingBooking.save();
          console.log('Updating existing pending booking:', existingBooking._id);
        }
      }

      const create_payment_json = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
          return_url: 'http://localhost:5173/success',
          cancel_url: 'http://localhost:5173/cancel'
        },
        transactions: [{
          item_list: {
            items: [{
              name: bookingData.service,
              sku: 'consultation',
              price: '10.00',
              currency: 'USD',
              quantity: 1
            }]
          },
          amount: {
            currency: 'USD',
            total: '10.00'
          },
          description: `Payment for ${bookingData.service}`
        }]
      };

      paypal.payment.create(create_payment_json, async (error, payment) => {
        if (error) {
          console.error('PayPal create payment error:', error);
          return res.status(400).json({ error: error.message });
        }

        const approvalUrl = payment.links.find(link => link.rel === 'approval_url')?.href;
        if (!approvalUrl) {
          console.error('No approval URL found in PayPal response:', payment);
          return res.status(400).json({ error: 'No approval URL returned from PayPal' });
        }

        try {
          // Create or update booking with pending status
          let booking;
          if (existingBooking) {
            booking = existingBooking;
          } else {
            booking = new appointmentModel({
              ...bookingData,
              date: new Date(bookingData.date),
              paymentMethod: 'paypal',
              paymentStatus: 'Pending',
              paypalOrderId: payment.id
            });
            await booking.save();
            console.log('Pending booking created:', booking._id);
          }

          res.status(200).json({ approvalUrl, paypalOrderId: payment.id, bookingId: booking._id });
        } catch (error) {
          if (error.code === 11000) {
            console.log('Duplicate booking detected, returning existing:', bookingData);
            const existing = await appointmentModel.findOne({
              email: bookingData.email,
              date: new Date(bookingData.date),
              selectedTime: bookingData.selectedTime,
              consultant: bookingData.consultant,
              service: bookingData.service
            });
            res.status(200).json({ approvalUrl, paypalOrderId: payment.id, bookingId: existing._id });
          } else {
            console.error('Error creating pending booking:', error);
            res.status(400).json({ error: error.message });
          }
        }
      });
    } catch (error) {
      console.error('Error in create payment:', error);
      res.status(400).json({ error: error.message });
    }
  } else if (action === 'confirm') {
    // Handle payment confirmation
    const { paypalOrderId, payerId, bookingId } = req.body;

    if (!paypalOrderId || !payerId || !bookingId) {
      console.error('Missing required fields for confirmation:', { paypalOrderId, payerId, bookingId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const booking = await appointmentModel.findById(bookingId);
      if (!booking) {
        console.error('Booking not found:', bookingId);
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.paymentStatus === 'Completed') {
        console.log('Booking already completed:', bookingId);
        return res.status(200).json({ booking });
      }

      const execute_payment_json = {
        payer_id: payerId
      };

      paypal.payment.execute(paypalOrderId, execute_payment_json, async (error, payment) => {
        if (error) {
          console.error('PayPal execute payment error:', error);
          return res.status(400).json({ error: error.message });
        }

        try {
          booking.paymentStatus = 'Completed';
          booking.paymentId = paypalOrderId;
          await booking.save();
          console.log('Booking confirmed:', booking._id);
          res.status(200).json({ booking, payment });
        } catch (error) {
          console.error('Error confirming booking:', error);
          res.status(400).json({ error: error.message });
        }
      });
    } catch (error) {
      console.error('Error in confirm payment:', error);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
};