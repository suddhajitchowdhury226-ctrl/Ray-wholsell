// fix-indexes.js - Fix MongoDB Index Conflicts
// Run with: node fix-indexes.js

const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ Please set MONGO_URI as an environment variable before running this script.");
  console.error("Example: $env:MONGO_URI=\"your-connection-string\" (PowerShell)");
  process.exit(1);
}

async function fixIndexes() {
  const client = new MongoClient(uri);
  
  try {
    console.log("🔧 Connecting to database to fix indexes...");
    await client.connect();
    console.log("✅ Connected successfully\n");
    
    const db = client.db();
    const productsCollection = db.collection("products");
    
    // 1. List existing indexes
    console.log("📋 Current indexes:");
    const indexes = await productsCollection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // 2. Drop old text indexes
    console.log("\n🗑️ Dropping old text indexes...");
    
    try {
      // Try to drop various possible text index names
      const textIndexNames = indexes
        .filter(index => 
          index.key && 
          typeof index.key === 'object' && 
          Object.values(index.key).includes('text')
        )
        .map(index => index.name);
      
      for (const indexName of textIndexNames) {
        try {
          await productsCollection.dropIndex(indexName);
          console.log(`✅ Dropped index: ${indexName}`);
        } catch (err) {
          console.log(`⚠️ Could not drop ${indexName}: ${err.message}`);
        }
      }
    } catch (err) {
      console.log("⚠️ Error dropping indexes:", err.message);
    }
    
    // 3. Create the correct text index that matches backend expectations
    console.log("\n📝 Creating correct text index...");
    
    try {
      await productsCollection.createIndex(
        { name: 'text', description: 'text', sku: 'text' },
        { 
          name: 'product_search_text',
          default_language: 'english',
          background: true
        }
      );
      console.log("✅ Created new text search index: { name: 'text', description: 'text', sku: 'text' }");
    } catch (err) {
      console.log("⚠️ Error creating text index:", err.message);
    }
    
    // 4. Ensure all other required indexes exist
    console.log("\n🔧 Ensuring other required indexes exist...");
    
    const requiredIndexes = [
      { key: { "role": 1 }, name: "role_1" },
      { key: { "websiteRole": 1 }, name: "websiteRole_1" },
      { key: { "categoryName": 1 }, name: "categoryName_1" },
      { key: { "department": 1 }, name: "department_1" },
      { key: { "item_number": 1 }, name: "item_number_1" },
      { key: { "product_id": 1 }, name: "product_id_1" },
      { key: { "sku": 1 }, name: "sku_1" },
      { key: { "isActive": 1 }, name: "isActive_1" }
    ];
    
    for (const indexSpec of requiredIndexes) {
      try {
        await productsCollection.createIndex(indexSpec.key, { 
          name: indexSpec.name,
          background: true 
        });
        console.log(`✅ Ensured index: ${indexSpec.name}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`✓ Index already exists: ${indexSpec.name}`);
        } else {
          console.log(`⚠️ Error creating ${indexSpec.name}: ${err.message}`);
        }
      }
    }
    
    // 5. Verify final index state
    console.log("\n📋 Final indexes:");
    const finalIndexes = await productsCollection.listIndexes().toArray();
    finalIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log("\n🎉 Index cleanup completed successfully!");
    console.log("✅ Your backend should now start without index conflicts.");
    
  } catch (err) {
    console.error("❌ Index fix failed:", err.message);
    console.error(err);
  } finally {
    await client.close();
  }
}

fixIndexes().catch(console.error);