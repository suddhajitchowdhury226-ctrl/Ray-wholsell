const mongoose = require('mongoose');
const User = require('./Models/user');
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Manual checkout email পাঠাচ্ছি real users দের কাছে...');

// Connect to MongoDB  
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ MongoDB connected');
  sendManualCheckoutEmails();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function sendManualCheckoutEmails() {
  try {
    // Get all real users
    const realUsers = await User.find({
      email: { $not: /test|example|demo/i },
      isVerified: true
    }).select('name email');

    console.log(`👥 ${realUsers.length}টি real users পাওয়া গেছে`);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Sample order data for demo email
    const sampleOrder = {
      orderNumber: 'ORD-' + Date.now(),
      total: 299.99,
      createdAt: new Date(),
      items: [
        { name: 'B COMPLEX (RASP) 1 OZ', quantity: 12, price: 13.99 },
        { name: 'B12 (RASP) 1000 MCG 1 OZ', quantity: 12, price: 11.00 }
      ]
    };

    // Email template with actual order format
    const generateOrderEmail = (user) => {
      const itemsHtml = sampleOrder.items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px; color: #333;">${item.name}</td>
          <td style="padding: 12px; text-align: center; color: #666;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; color: #333;">$${item.price.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right; font-weight: 600; color: #333;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('');

      return `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📧 Order Confirmation Email Test</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">This is how checkout emails look!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 25px;">
              <h2 style="color: #77a13d; margin: 0 0 15px 0; font-size: 24px;">Order #${sampleOrder.orderNumber}</h2>
              <p style="color: #666; margin: 5px 0;">Order Date: ${new Date().toLocaleDateString('en-US')}</p>
              <p style="color: #666; margin: 5px 0;">Status: <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 15px; font-weight: 600;">Pending Review</span></p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Customer Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>${user.name}</strong></p>
              <p style="margin: 5px 0; color: #555;">📧 ${user.email}</p>
              <p style="margin: 5px 0; color: #555;">📍 Sample Address: 123 Test Street, Dhaka 1000</p>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 15px 12px; text-align: left; color: #333; font-weight: 600;">Product</th>
                    <th style="padding: 15px 12px; text-align: center; color: #333; font-weight: 600;">Qty</th>
                    <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Unit Price</th>
                    <th style="padding: 15px 12px; text-align: right; color: #333; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h3>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #333; font-size: 20px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #77a13d;">$${sampleOrder.total}</span>
              </div>
            </div>

            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #007bff;">
              <h3 style="color: #007bff; margin: 0 0 15px 0; font-size: 18px;">✅ Email System Working!</h3>
              <p style="margin: 8px 0; color: #555;">• যদি আপনি এই email টি পেয়ে থাকেন তাহলে checkout emails কাজ করছে</p>
              <p style="margin: 8px 0; color: #555;">• Real checkout এর পর এই format এ email আসবে</p>
              <p style="margin: 8px 0; color: #555;">• Email sender: satpalemailcheck12@gmail.com</p>
              <p style="margin: 8px 0; color: #555;">• Spam/Junk folder চেক করতে ভুলবেন না!</p>
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
      `;
    };

    // Send emails to all real users
    for (const user of realUsers) {
      try {
        console.log(`\n📤 Sending to: ${user.email}`);
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📧 Checkout Email Test - Ray Healthy Living (This is how order emails look)',
          html: generateOrderEmail(user)
        };

        const result = await transporter.sendMail(mailOptions);
        
        console.log(`✅ Successfully sent!`);
        console.log(`   📧 Message ID: ${result.messageId}`);
        console.log(`   📤 Response: ${result.response}`);
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (emailError) {
        console.log(`❌ Error sending to ${user.email}:`, emailError.message);
      }
    }

    console.log(`\n🎯 EMAIL TEST COMPLETED!`);
    console.log(`📧 আমি checkout format এ emails পাঠিয়েছি এই addresses এ:`);
    realUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.name})`);
    });
    
    console.log(`\n💡 এখন users দের বলুন চেক করতে:`);
    console.log(`   📧 Inbox folder`);
    console.log(`   📧 Spam/Junk folder`);
    console.log(`   📧 Promotions tab (Gmail users)`);
    console.log(`   📧 Sender: satpalemailcheck12@gmail.com`);

  } catch (error) {
    console.error('❌ Error in manual email sending:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}