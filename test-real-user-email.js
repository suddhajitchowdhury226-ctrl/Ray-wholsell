const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Real user দের কাছে test email পাঠাচ্ছি...');

// Real user email addresses from database
const realUserEmails = [
  'lestercalvert377@gmail.com',
  'suddhajitchowdhury226@gmail.com', 
  'retailer@raywholesale.com',
  'wholesaler@raywholesale.com',
  'admin@raywholesale.com'
];

async function sendTestEmails() {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('✅ Email transporter created');
    console.log('📤 From:', process.env.EMAIL_USER);

    // Test email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #77a13d;">📧 Email System Test - Ray Wholesale</h1>
        
        <p>এই email টি Ray Wholesale system থেকে পাঠানো হয়েছে email functionality test করার জন্য।</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>✅ Email System Working Properly!</h3>
          <p>যদি আপনি এই email টি পেয়ে থাকেন, তাহলে আমাদের email system ঠিকভাবে কাজ করছে।</p>
        </div>

        <h3>📋 Order Confirmation Emails:</h3>
        <ul>
          <li>✅ Order creation emails কাজ করছে</li>
          <li>✅ Email sending system active</li>
          <li>✅ Gmail SMTP configured</li>
        </ul>

        <div style="border-left: 4px solid #77a13d; padding-left: 15px; margin: 20px 0;">
          <p><strong>📧 Sender:</strong> satpalemailcheck12@gmail.com</p>
          <p><strong>📅 Date:</strong> ${new Date().toLocaleString('bn-BD')}</p>
          <p><strong>🎯 Purpose:</strong> Email delivery verification</p>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is a test email from Ray Wholesale System. 
          If you received this, order confirmation emails should work properly.
        </p>
      </div>
    `;

    // Send email to each real user
    for (const email of realUserEmails) {
      try {
        console.log(`\n📤 পাঠাচ্ছি → ${email}`);
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: '📧 Ray Wholesale - Email System Test (Please Check)',
          html: emailContent,
        };

        const result = await transporter.sendMail(mailOptions);
        
        console.log(`✅ সফলভাবে পাঠানো হয়েছে!`);
        console.log(`   📧 Message ID: ${result.messageId}`);
        console.log(`   📤 Response: ${result.response}`);
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (emailError) {
        console.log(`❌ Error sending to ${email}:`, emailError.message);
      }
    }

    console.log(`\n🎯 IMPORTANT INSTRUCTIONS FOR USERS:`);
    console.log(`📧 Email গুলো এই addresses এ পাঠানো হয়েছে:`);
    realUserEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
    });
    
    console.log(`\n💡 Users দের বলুন:`);
    console.log(`   1. Inbox folder চেক করতে`);
    console.log(`   2. Spam/Junk folder চেক করতে`);
    console.log(`   3. Gmail হলে Promotions tab চেক করতে`);
    console.log(`   4. Email sender: satpalemailcheck12@gmail.com`);
    
  } catch (error) {
    console.error('❌ Error in test email process:', error);
  }
}

sendTestEmails();