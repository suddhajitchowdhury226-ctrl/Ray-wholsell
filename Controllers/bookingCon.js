const appointmentModel = require("../Models/appointmentModel");
const nodemailer = require('nodemailer');

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'wholesalerray@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'edlu xryc tmgn pbip'
  }
});

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

// New endpoint for consultation booking with email notifications
exports.createConsultation = async (req, res) => {
  try {
    const {
      consultationType,
      fullName,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
      submittedAt
    } = req.body;

    console.log('📋 Creating consultation request:');
    console.log('   Name:', fullName);
    console.log('   Email:', email);
    console.log('   Phone:', phone);
    console.log('   Date:', preferredDate);
    console.log('   Time:', preferredTime);
    console.log('   Type:', consultationType);

    // Validate required fields
    if (!fullName || !email || !phone || !preferredDate || !preferredTime) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['fullName', 'email', 'phone', 'preferredDate', 'preferredTime']
      });
    }

    // Create consultation document
    const consultation = {
      fullName,
      email,
      phone,
      consultationType,
      preferredDate,
      preferredTime,
      message: message || '',
      submittedAt: new Date(submittedAt),
      status: 'pending',
      createdAt: new Date()
    };

    // Save to database (using appointmentModel for consistency)
    const savedConsultation = await appointmentModel.create(consultation);
    console.log('✓ Consultation saved to database:', savedConsultation._id);

    // Email to customer
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #77a13d 0%, #9fc965 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Ray's Healthy Living</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Consultation Request Confirmation</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
            Hello <strong>${fullName}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">
            Thank you for requesting a consultation with Ray's Healthy Living. We have received your request and our team will contact you shortly to confirm your appointment.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #77a13d;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Consultation Details</h3>
            
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Type</p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${consultationType}</p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Preferred Date</p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div style="margin-bottom: 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Preferred Time</p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${preferredTime}</p>
            </div>
          </div>

          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #374151; font-size: 14px;">
              <strong>What happens next?</strong><br>
              We will review your request and confirm your appointment via email or phone within 24 hours.
            </p>
          </div>

          <div style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">If you have any questions, please contact us:</p>
            <p style="margin: 5px 0; color: #374151;">
              <strong>Phone:</strong> (651) 699-3438
            </p>
            <p style="margin: 5px 0; color: #374151;">
              <strong>Email:</strong> info@rayshealthyliving.com
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: white; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Ray's Healthy Living. All rights reserved.
          </p>
        </div>
      </div>
    `;

    // Email to admin
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #77a13d 0%, #9fc965 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🔔 New Consultation Request</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ray's Healthy Living Admin Dashboard</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">Consultation Request Received</h2>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #77a13d; padding-bottom: 10px;">Customer Information</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 150px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937;">${fullName}</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">
                  <a href="mailto:${email}" style="color: #77a13d; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">
                  <a href="tel:${phone}" style="color: #77a13d; text-decoration: none;">${phone}</a>
                </td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #77a13d; padding-bottom: 10px;">Appointment Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 150px;">Consultation Type:</td>
                <td style="padding: 8px 0; color: #1f2937;"><strong>${consultationType}</strong></td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Preferred Date:</td>
                <td style="padding: 8px 0; color: #1f2937;"><strong>${new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Preferred Time:</td>
                <td style="padding: 8px 0; color: #1f2937;"><strong>${preferredTime}</strong></td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Submitted:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date(submittedAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          ${message ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #77a13d; padding-bottom: 10px;">Additional Information</h3>
            <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Action Required:</strong> Please contact the customer to confirm the appointment.
            </p>
          </div>
        </div>

        <div style="padding: 20px; background: white; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">
            ID: ${savedConsultation._id.toString().substring(0, 12)}...
          </p>
        </div>
      </div>
    `;

    // Send email to customer
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'wholesalerray@gmail.com',
        to: email,
        subject: '✓ Consultation Request Received - Ray\'s Healthy Living',
        html: customerEmailHtml
      });
      console.log('✓ Customer confirmation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Error sending customer email:', emailError.message);
    }

    // Send email to admin
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'wholesalerray@gmail.com',
        to: 'info@rayshealthyliving.com',
        subject: `🔔 New Consultation Request from ${fullName}`,
        html: adminEmailHtml
      });
      console.log('✓ Admin notification email sent to: info@rayshealthyliving.com');
    } catch (emailError) {
      console.error('❌ Error sending admin email:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Consultation request submitted successfully',
      consultationId: savedConsultation._id
    });

  } catch (error) {
    console.error('❌ Error creating consultation:', error);
    res.status(500).json({
      message: 'Error creating consultation request',
      error: error.message
    });
  }
};