const mongoose = require('mongoose');
const Order = require('./Models/orderModel');
const User = require('./Models/user');
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔍 Debugging real order email sending...');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
  console.log('✅ Connected to MongoDB');
  checkRecentOrders();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkRecentOrders() {
  try {
    console.log('📊 Checking recent orders...');
    
    // Get the most recent 5 orders
    const recentOrders = await Order.find({})
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📋 Found ${recentOrders.length} recent orders:`);
    
    recentOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order #${order.orderNumber}`);
      console.log(`   📅 Created: ${order.createdAt}`);
      console.log(`   👤 User: ${order.user?.name || 'N/A'} (${order.user?.email || 'N/A'})`);
      console.log(`   📧 Order Email: ${order.userEmail || 'N/A'}`);
      console.log(`   📍 Address: ${order.deliveryAddress?.name || 'N/A'} - ${order.deliveryAddress?.email || 'N/A'}`);
      console.log(`   💰 Total: $${order.total}`);
      console.log(`   📦 Status: ${order.status}`);
      console.log(`   🛒 Items: ${order.items?.length || 0}`);
    });

    if (recentOrders.length > 0) {
      console.log(`\n🧪 Testing email sending for most recent order...`);
      const testOrder = recentOrders[0];
      
      // Test sending email for the most recent order
      await testEmailForOrder(testOrder);
    }

  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

async function testEmailForOrder(order) {
  try {
    console.log(`\n📧 Testing email for Order #${order.orderNumber}...`);
    
    const targetEmail = order.userEmail || order.user?.email || order.deliveryAddress?.email;
    
    if (!targetEmail) {
      console.log('❌ No email address found for this order');
      return;
    }
    
    console.log(`📧 Target email: ${targetEmail}`);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('🔧 Testing transporter connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');

    // Generate email content (simplified version)
    const itemsHtml = order.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #77a13d;">Order Confirmation #${order.orderNumber}</h1>
        <p>Thank you for your order!</p>
        
        <h3>Delivery Address:</h3>
        <p>
          ${order.deliveryAddress?.name || 'N/A'}<br>
          ${order.deliveryAddress?.addressLine1 || 'N/A'}<br>
          ${order.deliveryAddress?.city || 'N/A'}, ${order.deliveryAddress?.state || 'N/A'} ${order.deliveryAddress?.zipcode || 'N/A'}<br>
          Email: ${order.deliveryAddress?.email || 'N/A'}
        </p>

        <h3>Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd;">Product</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Qty</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Price</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3>Order Summary:</h3>
        <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
        <p>Status: ${order.status}</p>
        <p>Order Date: ${order.createdAt.toLocaleDateString()}</p>
        
        <p>Thank you for choosing Ray Healthy Living!</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: targetEmail,
      subject: `Order Confirmation - ${order.orderNumber} - Ray Healthy Living`,
      html: emailHtml,
    };

    console.log('📧 Sending test email...');
    console.log('📧 From:', mailOptions.from);
    console.log('📧 To:', mailOptions.to);
    console.log('📧 Subject:', mailOptions.subject);

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);
    console.log(`\n🎯 Please check the inbox of: ${targetEmail}`);
    console.log('📧 Also check spam/junk folder if not found in inbox');

  } catch (emailError) {
    console.error('❌ Error sending test email:', emailError);
    console.error('❌ Error details:', {
      message: emailError.message,
      code: emailError.code,
      command: emailError.command,
      response: emailError.response
    });
  }
}