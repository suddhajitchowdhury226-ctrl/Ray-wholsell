# 📦 Product Upload Guide - Ray Wholesale

## Overview
This guide explains how to upload 483 products from the Excel file to your MongoDB database, replacing old products with new data from the **Master Copy Vitality Works Product List 2026**.

---

## ✅ What Has Been Done

### 1. **Data Extraction** ✓
- Extracted **483 unique products** from the Excel file
- Mapped Excel columns to database fields:
  - **RHL GSI Barcode** → UPC (lookup_code)
  - **PRODUCT NAME** → Product Title (name)
  - **RHL Short Product Description** → Description
  - **Ingredients** → Ingredient Field
  - **Manufacture WHOLESALE** → Wholesale Price (sellPrice)
  - **RHL COST** → Buy Price (buyPrice)
  - **Product ID** → Item Number (item_number)

### 2. **File Generated** ✓
- **`products-extracted.json`** - Contains all 483 products ready for upload
- Properly formatted with all required fields

---

## 🚀 Upload Instructions

### **Step 1: Verify the Extracted Data**
```bash
# Check the first 3 products in the JSON file
cat products-extracted.json | head -100
```

### **Step 2: Run the Upload Script**

Choose **ONE** of these options:

#### **Option A: Upload to Local Database (for testing)**
```bash
cd c:\Users\debna\OneDrive\Documents\Ray Full System\Ray-wholsell-1
npm install  # if not already installed
node ../upload-products-to-db.js
```

#### **Option B: Upload to Production Database**
The script will:
1. ✅ Connect to MongoDB using DATABASE_URL from `.env`
2. ✅ Delete ALL old products
3. ✅ Create categories automatically (Health Supplements)
4. ✅ Create brands from Product Type
5. ✅ Upload 483 new products with proper mapping

```bash
node ../upload-products-to-db.js
```

---

## 📊 Product Data Mapping

### Database Schema (productModel.js)
```javascript
{
  name: "Product Title",                    // from: PRODUCT NAME / New RHL Product Name
  sku: "UPC Code",                          // from: RHL GSI Barcode / UPC
  item_number: "Product ID",                // from: Product ID
  lookup_code: "UPC",                       // from: UPC
  sellPrice: 12.70,                         // from: Manufacture WHOLESALE Price
  buyPrice: 9.52,                           // from: RHL COST 25% LESS
  stock: 100,                               // Default value
  category: ObjectId,                       // "Health Supplements" (auto-created)
  brand: ObjectId,                          // from: Product Type (auto-created)
  description: "Short description...",      // from: RHL Short Product Description
  ingredient: "Ingredients list...",        // from: Ingredients
  additional: "Ingredients list...",        // from: Ingredients (duplicate for details)
}
```

### Sample Product
```json
{
  "name": "Adaptogen Vitality Complex",
  "upc": "788332173202",
  "rhlProductId": "200",
  "sellPrice": 12.7,
  "rhlCost": 9.52,
  "description": "A thoughtfully formulated blend designed to support stress resilience, relaxation and everyday vitality.",
  "ingredients": "157.5 mg Organic Eleuthero Root, 157.5 mg Organic Ashwagandha Root...",
  "size": "90 vcp"
}
```

---

## ⚠️ Important Notes

### **Before Running Upload**
1. ✅ Backup your current database (VERY IMPORTANT!)
   ```bash
   # This will delete ALL products
   ```

2. ✅ Test the script on a copy first (if available)

3. ✅ Ensure `.env` file has correct DATABASE_URL

### **What Gets Deleted**
- ❌ ALL products (the script runs `deleteMany({})`)
- ✅ Categories and Brands are preserved (not deleted)

### **What Gets Created**
- ✅ 483 new products
- ✅ "Health Supplements" category (if not exists)
- ✅ Brands from Product Type (auto-created)

---

## 🔍 Verification Steps

### After Upload, Verify in MongoDB:

#### **1. Check Products Count**
```javascript
db.products.countDocuments()
// Should show: 483
```

#### **2. Check Sample Product**
```javascript
db.products.findOne({ name: "Adaptogen Vitality Complex" })
```

#### **3. Verify Prices**
```javascript
db.products.find({ name: /Adaptogen/ }).pretty()
// Should show sellPrice: 12.7, buyPrice: 9.52
```

#### **4. Check UPC Field**
```javascript
db.products.findOne({ lookup_code: "788332173202" })
// Should find the product by UPC
```

---

## 🌐 Display on Website

### Frontend Component (ProductSection.jsx)
Products will automatically display on your website:

```jsx
// Products now show:
- Product Name (from Excel title)
- Wholesale Price (from Manufacture WHOLESALE)
- Description (from RHL Short Product Description)
- Ingredients (shown in product details)
- UPC (lookup_code)
- Stock Status
```

### API Endpoints Ready
```
GET /api/user/get-products         // Get all products
GET /api/user/categories           // Get categories
GET /api/user/get-brands          // Get brands
GET /products-details/{id}         // Get single product
```

---

## 🐛 Troubleshooting

### **Error: "Connect ECONNREFUSED"**
- MongoDB is not running
- Check DATABASE_URL in `.env`
- Ensure Cluster is accessible

### **Error: "Cast to ObjectId failed"**
- Category/Brand creation issue
- Clear the category collection and rerun

### **Products Not Showing**
- Clear browser cache
- Rebuild frontend (`npm run build`)
- Check product.stock > 0 (set to 100 by default)

### **Duplicate UPCs**
- Check `products-extracted.json` for duplicates
- Script removes duplicates automatically

---

## 📋 Checklist

- [ ] Backup current database
- [ ] Verify `.env` DATABASE_URL
- [ ] Run `node extract-products.js` (generates JSON)
- [ ] Review `products-extracted.json`
- [ ] Run `node upload-products-to-db.js`
- [ ] Verify 483 products in MongoDB
- [ ] Test website displays products
- [ ] Check prices display correctly
- [ ] Test search/filter functionality
- [ ] Clear frontend cache & rebuild

---

## 📞 Support

If you encounter issues:
1. Check the error message in console
2. Verify MongoDB connection
3. Check product schema in `Models/productModel.js`
4. Review `products-extracted.json` for data quality

---

## 🎯 Expected Results

After successful upload:
- ✅ 483 products in database
- ✅ All with correct UPC, SKU, pricing
- ✅ Descriptions and ingredients populated
- ✅ Categories auto-created
- ✅ Brands auto-created from Product Type
- ✅ Ready to display on frontend

**Estimated upload time: 2-5 minutes** (depending on connection speed)
