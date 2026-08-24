const fs = require('fs');
const path = require('path');

console.log('🔍 Monitoring checkout-related logs...');

// Check if there are any log files
const logDir = path.join(__dirname, 'logs');
if (fs.existsSync(logDir)) {
  console.log('📁 Log directory found');
  const logFiles = fs.readdirSync(logDir);
  console.log('📄 Log files:', logFiles);
  
  // Read recent log files
  logFiles.forEach(file => {
    if (file.includes('.log')) {
      const logPath = path.join(logDir, file);
      const stats = fs.statSync(logPath);
      console.log(`\n📄 ${file} (${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toLocaleString()})`);
      
      // Read last 50 lines of the log
      try {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n');
        const recentLines = lines.slice(-50).filter(line => 
          line.includes('order') || 
          line.includes('email') || 
          line.includes('checkout') ||
          line.includes('📦') ||
          line.includes('📧') ||
          line.includes('✅') ||
          line.includes('❌')
        );
        
        if (recentLines.length > 0) {
          console.log('📋 Recent checkout/email related logs:');
          recentLines.forEach(line => console.log('  ' + line));
        }
      } catch (err) {
        console.log('❌ Error reading log file:', err.message);
      }
    }
  });
} else {
  console.log('❌ No log directory found');
}

// Also check if the backend is configured to log to console
console.log('\n💡 DEBUGGING TIPS:');
console.log('1. Check if backend server console shows order creation logs');
console.log('2. Look for 📧 and ✅ emoji logs during checkout');
console.log('3. Check spam/junk folders for emails');
console.log('4. Verify user email addresses are correct');
console.log('5. Test with a different email address (Gmail, Yahoo, etc.)');

// Check the order controller file for console.log statements
const orderControllerPath = path.join(__dirname, 'Controllers', 'orderController.js');
if (fs.existsSync(orderControllerPath)) {
  console.log('\n🔍 Checking order controller for logging statements...');
  const content = fs.readFileSync(orderControllerPath, 'utf8');
  const logStatements = content.match(/console\.(log|error|info|warn).*[📧📦✅❌]/g);
  
  if (logStatements) {
    console.log('📋 Found these logging statements in order controller:');
    logStatements.forEach(stmt => console.log('  ' + stmt));
  } else {
    console.log('⚠️  No emoji-based logging found in order controller');
  }
}

console.log('\n🚀 To monitor real-time checkout:');
console.log('1. Keep backend terminal open');
console.log('2. Watch for console output during checkout');
console.log('3. Look specifically for email sending confirmations');