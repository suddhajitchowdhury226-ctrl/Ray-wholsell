// setup-complete-database.js - Complete Database Setup with More Data
// This creates a comprehensive database with all necessary collections
// Run with: node setup-complete-database.js

const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ Please set MONGO_URI as an environment variable before running this script.");
  console.error("Example: $env:MONGO_URI=\"your-connection-string\" (PowerShell)");
  process.exit(1);
}

// Categories with departments
const categoriesData = [
  // VITAMINS A - Z
  { _id: new ObjectId(), name: "B VITAMINS", department: "VITAMINS A - Z" },
  { _id: new ObjectId(), name: "C VITAMINS", department: "VITAMINS A - Z" },
  { _id: new ObjectId(), name: "D VITAMINS", department: "VITAMINS A - Z" },
  { _id: new ObjectId(), name: "VITAMIN A-Z", department: "VITAMINS A - Z" },
  
  // JOINT SUPPORT
  { _id: new ObjectId(), name: "PAIN MANAGEMENT", department: "JOINT SUPPORT" },
  { _id: new ObjectId(), name: "JOINT HEALTH", department: "JOINT SUPPORT" },
  { _id: new ObjectId(), name: "INFLAMMATION", department: "JOINT SUPPORT" },
  
  // AROMA THERAPY
  { _id: new ObjectId(), name: "ESSENTIAL OILS", department: "AROMA THERAPY" },
  { _id: new ObjectId(), name: "CARRIER OIL", department: "AROMA THERAPY" },
  
  // IMMUNE SYSTEM SUPPORT
  { _id: new ObjectId(), name: "IMMUNE SUPPORT", department: "IMMUNE SYSTEM SUPPORT" },
  { _id: new ObjectId(), name: "IMMUNE ANTIOXIDANT SUPPORT", department: "IMMUNE SYSTEM SUPPORT" },
  
  // DIGESTION - DETOX
  { _id: new ObjectId(), name: "DIGESTIVE AID - ENZYMES", department: "DIGESTION - DETOX" },
  { _id: new ObjectId(), name: "DETOX", department: "DIGESTION - DETOX" },
  
  // HERBAL SUPPLEMENTS A - Z
  { _id: new ObjectId(), name: "HERBAL SUPPLEMENT", department: "HERBAL SUPPLEMENTS A - Z" },
  { _id: new ObjectId(), name: "LIQUID HERBS", department: "HERBAL SUPPLEMENTS A - Z" },
  
  // MINERALS
  { _id: new ObjectId(), name: "IRON", department: "MINERALS" },
  { _id: new ObjectId(), name: "ZINC", department: "MINERALS" }
];

// More comprehensive products data
const productsData = [
  // B Vitamins
  {
    _id: new ObjectId(),
    name: "B COMPLEX (RASP) 1 OZ",
    item_number: 1,
    product_id: "4013021",
    lookup_code: "810078423539",
    sku: "810078423539",
    bin_location: "1/2 >*",
    buyPrice: 13.99,
    sellPrice: 19.99,
    stock: 50,
    role: "wholesaler",
    websiteRole: "wholesaler",
    category: categoriesData.find(c => c.name === "B VITAMINS"),
    categoryName: "B VITAMINS",
    department: "VITAMINS A - Z",
    images: [],
    description: "High-quality B Complex vitamin supplement in raspberry flavor",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: "B12 (RASP) 1000 MCG 1 OZ",
    item_number: 2,
    product_id: "4013011",
    lookup_code: "810078423553",
    sku: "810078423553",
    bin_location: "1/2 >*",
    buyPrice: 13.99,
    sellPrice: 19.99,
    stock: 35,
    role: "wholesaler",
    websiteRole: "wholesaler",
    category: categoriesData.find(c => c.name === "B VITAMINS"),
    categoryName: "B VITAMINS",
    department: "VITAMINS A - Z",
    images: [],
    description: "Vitamin B12 supplement 1000 MCG in raspberry flavor",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // C Vitamins
  {
    _id: new ObjectId(),
    name: "VIT C 500 MG ORNG 4 OZ",
    item_number: 3,
    product_id: "4017614",
    lookup_code: "810078423690",
    sku: "810078423690",
    bin_location: "1/3 >*",
    buyPrice: 13.99,
    sellPrice: 19.99,
    stock: 28,
    role: "wholesaler",
    websiteRole: "wholesaler",
    category: categoriesData.find(c => c.name === "C VITAMINS"),
    categoryName: "C VITAMINS",
    department: "VITAMINS A - Z",
    images: [],
    description: "Vitamin C 500 MG in orange flavor, 4 oz bottle",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Joint Support
  {
    _id: new ObjectId(),
    name: "JOINT SUPPORT FORMULA",
    item_number: 4,
    product_id: "4020001",
    lookup_code: "810078425001",
    sku: "810078425001",
    bin_location: "2/1 >*",
    buyPrice: 24.99,
    sellPrice: 39.99,
    stock: 18,
    role: "wholesaler",
    websiteRole: "wholesaler",
    category: categoriesData.find(c => c.name === "PAIN MANAGEMENT"),
    categoryName: "PAIN MANAGEMENT",
    department: "JOINT SUPPORT",
    images: [],
    description: "Comprehensive joint support formula with natural ingredients",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Essential Oils
  {
    _id: new ObjectId(),
    name: "LAVENDER ESSENTIAL OIL",
    item_number: 5,
    product_id: "4030001",
    lookup_code: "810078430001",
    sku: "810078430001",
    bin_location: "3/1 >*",
    buyPrice: 19.99,
    sellPrice: 29.99,
    stock: 25,
    role: "wholesaler",
    websiteRole: "wholesaler",
    category: categoriesData.find(c => c.name === "ESSENTIAL OILS"),
    categoryName: "ESSENTIAL OILS",
    department: "AROMA THERAPY",
    images: [],
    description: "Pure lavender essential oil for aromatherapy and relaxation",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Sample admin user
const adminUser = {
  _id: new ObjectId(),
  name: "Admin User",
  email: "admin@raywholesale.com",
  password: "$2b$10$example.hash.here",
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

async function setupCompleteDatabase() {
  const client = new MongoClient(uri);
  
  try {
    console.log("🚀 Setting up complete Ray Wholesale database...");
    console.log("🔍 Connecting to database...");
    await client.connect();
    console.log("✅ Connected successfully\n");
    
    const db = client.db();
    console.log(`📂 Database: ${db.databaseName}\n`);
    
    // 1. Setup Categories
    console.log("📋 Setting up categories...");
    const categoriesCollection = db.collection("categories");
    await categoriesCollection.deleteMany({});
    const categoryResult = await categoriesCollection.insertMany(categoriesData);
    console.log(`✅ Inserted ${categoryResult.insertedCount} categories`);
    
    // 2. Setup Products  
    console.log("📦 Setting up products...");
    const productsCollection = db.collection("products");
    await productsCollection.deleteMany({});
    const productResult = await productsCollection.insertMany(productsData);
    console.log(`✅ Inserted ${productResult.insertedCount} products`);
    
    // 3. Setup Users Collection
    console.log("👥 Setting up users collection...");
    const usersCollection = db.collection("users");
    await usersCollection.deleteMany({});
    await usersCollection.insertOne(adminUser);
    console.log(`✅ Inserted admin user`);
    
    // 4. Create all necessary indexes
    console.log("🔍 Creating optimized indexes...");
    
    // Product indexes
    await productsCollection.createIndex({ "role": 1 });
    await productsCollection.createIndex({ "websiteRole": 1 });
    await productsCollection.createIndex({ "categoryName": 1 });
    await productsCollection.createIndex({ "department": 1 });
    await productsCollection.createIndex({ "item_number": 1 });
    await productsCollection.createIndex({ "product_id": 1 });
    await productsCollection.createIndex({ "sku": 1 });
    await productsCollection.createIndex({ "name": "text", "description": "text" });
    await productsCollection.createIndex({ "isActive": 1 });
    
    // Category indexes
    await categoriesCollection.createIndex({ "name": 1 });
    await categoriesCollection.createIndex({ "department": 1 });
    
    // User indexes
    await usersCollection.createIndex({ "email": 1 }, { unique: true });
    await usersCollection.createIndex({ "role": 1 });
    
    console.log("✅ All indexes created successfully");
    
    // 5. Verification
    console.log("\n🔍 Verifying complete setup...");
    
    const stats = {
      totalProducts: await productsCollection.countDocuments(),
      wholesalerProducts: await productsCollection.countDocuments({ role: "wholesaler" }),
      activeProducts: await productsCollection.countDocuments({ isActive: true }),
      totalCategories: await categoriesCollection.countDocuments(),
      departments: await categoriesCollection.distinct("department"),
      totalUsers: await usersCollection.countDocuments()
    };
    
    console.log(`📊 Total products: ${stats.totalProducts}`);
    console.log(`📊 Wholesaler products: ${stats.wholesalerProducts}`);
    console.log(`📊 Active products: ${stats.activeProducts}`);
    console.log(`📊 Total categories: ${stats.totalCategories}`);
    console.log(`📊 Departments: ${stats.departments.length}`);
    console.log(`📊 Total users: ${stats.totalUsers}`);
    
    // Test the exact query your frontend uses
    console.log("\n🧪 Testing frontend queries...");
    
    const frontendQuery = await productsCollection.find({
      role: "wholesaler",
      isActive: true
    }).sort({ item_number: 1 }).limit(7).toArray();
    
    console.log(`✅ Frontend query test: ${frontendQuery.length} products returned`);
    frontendQuery.forEach(p => {
      console.log(`   - ${p.name} (ID: ${p.item_number}, Cat: ${p.categoryName})`);
    });
    
    // Test categories query
    const categoriesQuery = await categoriesCollection.find({}).sort({ name: 1 }).toArray();
    console.log(`✅ Categories query test: ${categoriesQuery.length} categories returned`);
    
    console.log("\n🎉 COMPLETE DATABASE SETUP SUCCESSFUL! 🎉");
    console.log("\n📋 What was created:");
    console.log("   ✅ Products collection with 5 sample wholesale products");
    console.log("   ✅ Categories collection organized by departments");
    console.log("   ✅ Users collection with admin user");
    console.log("   ✅ All necessary database indexes");
    console.log("   ✅ Proper data structure for your API endpoints");
    
    console.log("\n🔧 Next steps:");
    console.log("   1. Update your Render service environment variables");
    console.log("   2. Restart your Render service");
    console.log("   3. Test your frontend - products should now appear!");
    console.log("   4. Add more products through your admin panel");
    
  } catch (err) {
    console.error("❌ Database setup failed:", err.message);
    console.error(err);
  } finally {
    await client.close();
  }
}

setupCompleteDatabase().catch(console.error);