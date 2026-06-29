const appointmentModel = require("../Models/appointmentModel");

exports.createBooking = async (req, res) => {
  console.log('createBooking called with data:', req.body);
  try {
    const booking = new appointmentModel({
      ...req.body,
      date: new Date(req.body.date),
      paymentStatus: 'Completed' // For local payments, mark as completed
    });
    await booking.save();
    console.log('Booking created successfully:', booking._id);
    res.status(201).json({ booking });
  } catch (error) {
    if (error.code === 11000) {
      console.log('Duplicate booking detected:', req.body);
      const existing = await appointmentModel.findOne({
        email: req.body.email,
        date: new Date(req.body.date),
        selectedTime: req.body.selectedTime,
        consultant: req.body.consultant,
        service: req.body.service
      });
      res.status(200).json({ booking: existing });
    } else {
      console.error('Error in createBooking:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await appointmentModel.find();
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await appointmentModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { date, consultant, service } = req.query;
    const selectedDate = new Date(date);
    
    // Fetch bookings for the specific date, consultant, and service
    const bookings = await appointmentModel.find({
      date: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      consultant: consultant,
      service: service,
      paymentStatus: 'Completed' // Only consider completed bookings
    });
    
    const startHour = 9;
    const endHour = 18;
    const timeSlots = [];
    
    // Generate all possible time slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
        const isBooked = bookings.some(booking => booking.selectedTime === time);
        timeSlots.push({ time, booked: isBooked });
      }
    }
    
    res.status(200).json({ timeSlots });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};