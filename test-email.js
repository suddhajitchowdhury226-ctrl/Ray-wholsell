const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Testing email configuration...');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set (length: ' + process.env.EMAIL_PASS.length + ')' : 'Not set');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
    process.exit(1);
  } else {
    console.log('✅ Email server is ready to take our messages');
    
    // Try sending a test email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test Email from Ray Wholesale System',
      text: 'This is a test email to verify the email configuration.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email configuration.</p>'
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log('❌ Error sending test email:', err);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully:', info.messageId);
        console.log('Response:', info.response);
        process.exit(0);
      }
    });
  }
});