// check-admin.js - Check Admin User Details
const { MongoClient } = require("mongodb");

// Direct MongoDB connection string
const uri = "mongodb+srv://raymandata_db_user:SCIzh0keqOjJFTNX@cluster0.0ooleyg.mongodb.net/test?appName=Cluster0";

async function checkAdmin() {
  const client = new MongoClient(uri);
  
  try {
    console.log("🔍 Checking for admin users in database...");
    await client.connect();
    console.log("✅ Connected to database successfully\n");
    
    const db = client.db();
    const usersCollection = db.collection("users");
    
    // Find all admin users
    const adminUsers = await usersCollection.find({ 
      role: "admin" 
    }).toArray();
    
    console.log("👑 ADMIN ACCOUNTS FOUND:");
    console.log("=" .repeat(50));
    
    if (adminUsers.length === 0) {
      console.log("❌ No admin users found in database!");
      console.log("\n🔧 To create admin user, run:");
      console.log("   $env:MONGO_URI=\"" + uri + "\"");  
      console.log("   node create-admin.js");
      return;
    }
    
    adminUsers.forEach((admin, index) => {
      console.log(`\n${index + 1}. ADMIN USER:`);
      console.log(`   🆔 ID: ${admin._id}`);
      console.log(`   👤 Name: ${admin.name || 'N/A'}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: [Use: admin123]`);
      console.log(`   👤 Role: ${admin.role}`);
      console.log(`   ✅ Status: ${admin.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   📅 Created: ${admin.createdAt ? admin.createdAt.toISOString() : 'N/A'}`);
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("🚀 ADMIN LOGIN INSTRUCTIONS:");
    console.log("   1. Go to: http://localhost:5180/");
    console.log("   2. Use these credentials:");
    console.log("      📧 Email: admin@raywholesale.com");
    console.log("      🔑 Password: admin123");
    console.log("   3. Access full admin dashboard");
    
    // Also check for other user types  
    console.log("\n📊 USER STATISTICS:");
    const userStats = await usersCollection.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    userStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} users`);
    });
    
  } catch (err) {
    console.error("❌ Database check failed:", err.message);
  } finally {
    await client.close();
  }
}

checkAdmin().catch(console.error);