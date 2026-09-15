/**
 * Test Email Setup - Run this to verify Gmail credentials work
 * Command: node test-email-setup.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailSetup() {
  console.log('🔍 Testing Email Configuration...\n');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Pass:', process.env.EMAIL_PASS ? '***[HIDDEN]***' : 'NOT SET');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS not set in .env');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('\n📧 Testing transporter...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter verified successfully!\n');

    // Send test email
    const testEmail = process.env.EMAIL_USER; // Send to self
    
    console.log(`📬 Sending test email to: ${testEmail}\n`);

    const result = await transporter.sendMail({
      from: `"Ray Healthy Living Test" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: 'Email Setup Test - Ray Healthy Living',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #77a13d;">✅ Email Configuration Works!</h2>
          <p>If you received this email, your email setup is configured correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('\n✨ Your email setup is ready for production!\n');

  } catch (error) {
    console.error('❌ Email Setup Failed!');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Gmail credentials are incorrect');
    console.error('2. Gmail app password needs to be generated (for 2FA accounts)');
    console.error('3. Gmail may have blocked the login attempt');
    console.error('\nSolution:');
    console.error('- Use a Gmail App Password (not your regular password)');
    console.error('- Enable 2-Step Verification on your Gmail account');
    console.error('- Go to: https://myaccount.google.com/apppasswords');
  }
}

testEmailSetup();
