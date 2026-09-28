/**
 * Run this on the Render server (or locally) to test email sending.
 * Usage: node test-email-render.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('\n❌ Email credentials missing — set EMAIL_USER and EMAIL_PASS in Render environment variables');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ Transporter verify failed:', error.message);
    console.error('Code:', error.code);
  } else {
    console.log('\n✅ Transporter is ready to send emails');
  }
});

// Send a test email
transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, // send to self
  subject: 'Render Email Test',
  html: '<p>If you see this, email is working correctly on Render.</p>',
}, (err, info) => {
  if (err) {
    console.error('\n❌ Test email failed:', err.message);
    console.error('Full error:', JSON.stringify({ code: err.code, command: err.command, response: err.response }));
  } else {
    console.log('\n✅ Test email sent successfully:', info.messageId);
  }
});
