/**
 * Test Sending OTP Email
 * Command: node test-send-otp.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSendOTP() {
  const testEmail = 'info@rayshealthyliving.com'; // Change this to test email
  const testName = 'Test User';
  const testOTP = '123456';

  console.log(`📧 Testing OTP Email Send to: ${testEmail}\n`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: 'Verify Your Email Address - Ray Healthy Living',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #77a13d; text-align: center;">Welcome to Ray Healthy Living!</h2>
          <p>Hi ${testName},</p>
          <p>Thank you for registering. Please verify your email address to complete your signup.</p>
          <p>Your Verification OTP is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
            ${testOTP}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't sign up for this account, please ignore this email.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ OTP Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log(`\n📬 Check ${testEmail} for the OTP email`);

  } catch (error) {
    console.error('❌ Failed to send OTP email');
    console.error('Error:', error.message);
  }
}

testSendOTP();
