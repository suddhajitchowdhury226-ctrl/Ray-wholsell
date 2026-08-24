const mongoose = require('mongoose');
const User = require('./Models/user');
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Testing OTP system for debnathtulanka@gmail.com...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  testOTPSystem();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testOTPSystem() {
  try {
    const yourEmail = 'debnathtulanka@gmail.com';
    
    console.log(`\n🔍 Checking user: ${yourEmail}`);
    const yourUser = await User.findOne({ email: yourEmail });
    
    if (!yourUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${yourUser.name}`);
    console.log(`📧 Email: ${yourUser.email}`);
    console.log(`✅ Verified: ${yourUser.isVerified}`);
    console.log(`📅 Created: ${yourUser.createdAt.toLocaleDateString()}`);
    
    // Check current OTP status
    console.log('\n🔍 Current OTP Status:');
    console.log(`📧 Verification OTP: ${yourUser.verificationOTP || 'None'}`);
    console.log(`⏰ OTP Expires: ${yourUser.verificationOTPExpires ? yourUser.verificationOTPExpires.toLocaleString() : 'None'}`);
    console.log(`🔒 Reset OTP: ${yourUser.resetOTP || 'None'}`);
    console.log(`⏰ Reset OTP Expires: ${yourUser.resetOTPExpires ? yourUser.resetOTPExpires.toLocaleString() : 'None'}`);
    
    // If user is already verified, they won't need verification OTP
    if (yourUser.isVerified) {
      console.log('\n✅ User is already verified - no verification OTP needed');
      console.log('💡 If you need password reset OTP, use forgot password feature');
      
      // Test password reset OTP instead
      console.log('\n🧪 Testing Password Reset OTP...');
      await testPasswordResetOTP(yourUser);
      return;
    }
    
    // Generate and send verification OTP
    console.log('\n🧪 Testing Verification OTP system...');
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log(`🔢 Generated OTP: ${otp}`);
    console.log(`⏰ Expires at: ${otpExpires.toLocaleString()}`);
    
    // Update user with new OTP
    yourUser.verificationOTP = otp;
    yourUser.verificationOTPExpires = otpExpires;
    await yourUser.save();
    
    console.log('✅ OTP saved to database');
    
    // Test email sending
    console.log('\n📧 Sending verification OTP email...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ray Healthy Living" <${process.env.EMAIL_USER}>`,
      to: yourEmail,
      subject: 'Email Verification OTP - Ray Healthy Living',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📧 Email Verification</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Verify your account</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 20px 0; color: #333;">Hi ${yourUser.name},</p>
            <p style="margin: 0 0 20px 0; color: #333;">Thank you for registering with Ray Healthy Living. Please verify your email address to complete your signup.</p>
            
            <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">Your Verification OTP is:</p>
            
            <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: white; letter-spacing: 8px; margin: 0; font-size: 36px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="margin: 20px 0 10px 0; color: #666;">⏰ This OTP is valid for <strong>10 minutes</strong>.</p>
            <p style="margin: 10px 0 20px 0; color: #666;">🔒 Please do not share this OTP with anyone.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #77a13d;">
              <p style="margin: 0; color: #555; font-size: 14px;">
                📝 Enter this OTP on the verification page to activate your account and start shopping!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">
                Thank you for choosing Ray Healthy Living!
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log(`📤 Sending from: ${process.env.EMAIL_USER}`);
    console.log(`📧 Sending to: ${yourEmail}`);
    console.log(`📋 Subject: ${mailOptions.subject}`);

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ VERIFICATION OTP EMAIL SENT SUCCESSFULLY!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📤 Response: ${result.response}`);
    
    console.log('\n🎯 CHECK YOUR EMAIL NOW!');
    console.log(`📧 Email: ${yourEmail}`);
    console.log('📁 Check these folders:');
    console.log('   📧 Inbox');
    console.log('   📧 Spam/Junk folder');
    console.log('   📧 Promotions tab (Gmail)');
    console.log('   📧 All Mail');
    console.log(`📤 Sender: ${process.env.EMAIL_USER}`);
    console.log(`🔢 OTP: ${otp}`);

  } catch (error) {
    console.error('❌ Error testing OTP system:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

async function testPasswordResetOTP(user) {
  try {
    console.log('🔒 Generating password reset OTP...');
    
    // Generate reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log(`🔢 Generated Reset OTP: ${otp}`);
    console.log(`⏰ Expires at: ${otpExpires.toLocaleString()}`);
    
    // Update user with reset OTP
    user.resetOTP = otp;
    user.resetOTPExpires = otpExpires;
    await user.save();
    
    console.log('✅ Reset OTP saved to database');
    
    // Send reset OTP email
    console.log('\n📧 Sending password reset OTP email...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset OTP - Ray Healthy Living',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #77a13d; text-align: center;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You have requested to reset your password. Use the OTP below to verify your identity:</p>
          
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h1 style="color: white; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          
          <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #e74c3c;">If you did not request this password reset, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ PASSWORD RESET OTP EMAIL SENT SUCCESSFULLY!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📤 Response: ${result.response}`);
    console.log(`🔢 Reset OTP: ${otp}`);
    
  } catch (error) {
    console.error('❌ Error sending password reset OTP:', error);
  }
}