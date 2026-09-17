const mongoose = require('mongoose');
require('dotenv').config();

const BulkOrder = require('./Models/bulkOrderModel');

async function updateMOQ() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Find existing bulk order
    let bulkOrder = await BulkOrder.findOne();

    if (bulkOrder) {
      // Update existing
      bulkOrder.bulkOrderNumber = 12;
      await bulkOrder.save();
      console.log('✅ MOQ updated from', bulkOrder.bulkOrderNumber, 'to 12');
    } else {
      // Create new
      bulkOrder = new BulkOrder({
        bulkOrderNumber: 12
      });
      await bulkOrder.save();
      console.log('✅ MOQ created and set to 12');
    }

    console.log(`✅ Current MOQ: ${bulkOrder.bulkOrderNumber}`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateMOQ();
