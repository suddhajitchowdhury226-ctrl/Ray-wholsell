const express = require('express');
const bookingRouter = express.Router();
const bookingController = require('../Controllers/bookingCon');
const { createBooking, getBookings, getAvailableTimeSlots, deleteBooking, createConsultation } = require('../Controllers/bookingCon');

bookingRouter.post('/create-booking', createBooking);
bookingRouter.get('/get-booking', getBookings);
bookingRouter.get('/timeslots', getAvailableTimeSlots);
bookingRouter.delete('/delete-booking/:id', deleteBooking);
bookingRouter.post('/create-consultation', createConsultation);

module.exports = bookingRouter;