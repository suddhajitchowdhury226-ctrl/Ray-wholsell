// create-admin.js - Create Admin User with Full Permissions
// Run with: node create-admin.js

const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ Please set MONGO_URI as an environment variable before running this script.");
  process.exit(1);
}

async function createAdmin() {
  const client = new MongoClient(uri);
  
  try {
    console.log("👑 Creating admin user with full permissions...");
    await client.connect();
    console.log("✅ Connected successfully\n");
    
    const db = client.db();
    const usersCollection = db.collection("users");
    
    // Admin user details
    const adminEmail = "admin@raywholesale.com";
    const adminPassword = "admin123"; // Change this to a secure password
    
    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ 
      $or: [
        { email: adminEmail },
        { role: "admin" }
      ]
    });
    
    if (existingAdmin) {
      console.log("⚠️ Admin user already exists!");
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Role: ${existingAdmin.role}`);
      console.log(`🆔 ID: ${existingAdmin._id}`);
      console.log("\n✅ You can use existing admin credentials to login");
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create admin user
    const adminUser = {
      _id: new ObjectId(),
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      permissions: {
        products: {
          create: true,
          read: true,
          update: true,
          delete: true,
          upload_images: true
        },
        categories: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        users: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        orders: {
          read: true,
          update: true,
          delete: true
        },
        dashboard: {
          access: true,
          analytics: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert admin user
    const result = await usersCollection.insertOne(adminUser);
    console.log("👑 Admin user created successfully!");
    console.log("\n📋 Admin Details:");
    console.log(`🆔 ID: ${result.insertedId}`);
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Role: admin`);
    console.log(`✅ Status: Active`);
    
    console.log("\n🔐 Permissions Granted:");
    console.log("   ✅ Create/Edit/Delete Products");
    console.log("   ✅ Upload Product Images");
    console.log("   ✅ Manage Categories");
    console.log("   ✅ View/Manage Users");
    console.log("   ✅ View/Manage Orders");
    console.log("   ✅ Access Dashboard & Analytics");
    
    console.log("\n🚀 Next Steps:");
    console.log("   1. Go to: http://localhost:5180/");
    console.log(`   2. Login with: ${adminEmail} / ${adminPassword}`);
    console.log("   3. Start managing your products!");
    
    // Create indexes for users collection
    await usersCollection.createIndex({ "email": 1 }, { unique: true });
    await usersCollection.createIndex({ "role": 1 });
    console.log("\n✅ User indexes created");
    
  } catch (err) {
    console.error("❌ Admin creation failed:", err.message);
    console.error(err);
  } finally {
    await client.close();
  }
}

createAdmin().catch(console.error);