const mongoose = require('mongoose');
const User = require('./Models/user');
const Cart = require('./Models/cartModel');
const Product = require('./Models/productModel');
const Order = require('./Models/orderModel');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  testEmailFlow();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate email template
const generateOrderConfirmationEmail = (order, userAddress) => {
  const itemsHtml = order.items.map(item => `
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
        <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmation</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order!</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 25px;">
          <h2 style="color: #77a13d; margin: 0 0 15px 0; font-size: 24px;">Order #${order.orderNumber}</h2>
          <p style="color: #666; margin: 5px 0;">Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US')}</p>
          <p style="color: #666; margin: 5px 0;">Status: <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 15px; font-weight: 600;">Pending Review</span></p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Delivery Address</h3>
          <p style="margin: 5px 0; color: #555;"><strong>${userAddress.name}</strong></p>
          <p style="margin: 5px 0; color: #555;">${userAddress.addressLine1}</p>
          <p style="margin: 5px 0; color: #555;">${userAddress.city}, ${userAddress.state} ${userAddress.zipcode}</p>
          <p style="margin: 5px 0; color: #555;">Email: ${userAddress.email}</p>
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
            <span style="color: #77a13d;">$${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 5px 0;">
            Thank you for choosing Ray Healthy Living!
          </p>
        </div>
      </div>
    </div>
  `;
};

async function testEmailFlow() {
  try {
    console.log('🧪 Testing order email flow...');

    // Find a test user (you may need to change this email to a real user)
    const testUser = await User.findOne({ email: { $exists: true } }).limit(1);
    if (!testUser) {
      console.log('❌ No user found in database');
      return;
    }

    console.log('👤 Found test user:', testUser.email);

    // Create a mock order
    const mockOrder = {
      orderNumber: `TEST-${Date.now()}`,
      items: [
        {
          name: 'Test Product 1',
          quantity: 2,
          price: 25.50
        },
        {
          name: 'Test Product 2', 
          quantity: 1,
          price: 15.00
        }
      ],
      total: 66.00,
      createdAt: new Date()
    };

    // Create mock address
    const mockAddress = {
      name: testUser.name || 'Test Customer',
      email: testUser.email,
      addressLine1: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipcode: '12345'
    };

    // Test email sending
    console.log('📧 Attempting to send test order confirmation email...');
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testUser.email,
      subject: `TEST Order Confirmation - ${mockOrder.orderNumber} - Ray Healthy Living`,
      html: generateOrderConfirmationEmail(mockOrder, mockAddress),
    };

    console.log('📧 Sending to:', testUser.email);
    console.log('📧 From:', process.env.EMAIL_USER);

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);
    console.log(`📧 Check the inbox of: ${testUser.email}`);

  } catch (error) {
    console.error('❌ Error in test email flow:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}