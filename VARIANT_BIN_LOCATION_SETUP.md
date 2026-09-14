# Variant Bin Location Implementation

This document covers the implementation of bin location tracking at the **variant level** (not product level) for Ray's Healthy Living warehouse management.

## Overview

- **Each variant** of a product can have a different bin location (e.g., the 90-count and 180-count of the same product can be in different bins)
- **Bin locations are stored in MongoDB** as a string field on each variant (e.g. `"6/4 >*"`, `"15/3 >*"`)
- **Variants without assigned locations** have `binLocation: null`
- **Total variants with locations**: 422 of 484 (62 still need manual assignment)

---

## Schema Changes

### Updated Variant Sub-Schema

```javascript
const variantSchema = new mongoose.Schema({
  size: String,
  itemNumber: String,
  rhlUpc: String,
  manufacturerUpc: String,
  price: Number,
  binLocation: {
    type: String,
    default: null,
    description: 'Warehouse bin location (e.g., "6/4 >*", "15/3 >*")'
  },
  status: String
}, { _id: true });
```

### File Location
**File**: `Ray-wholsell-1/Models/productModel.js`

---

## Setup Instructions

### Step 1: Update Backend Schema (Already Done ✓)

The variant schema has been updated to include `binLocation` field. This change is backward compatible — existing products will have `binLocation: null` for each variant.

### Step 2: Backfill Bin Locations from Seed File

Run the backfill script to populate bin locations from the updated seed file:

```bash
cd Ray-wholsell-1
node backfill-bin-locations.js
```

**What it does:**
- Reads `rhl_products_with_bin_location.json` (408 products, 484 variants)
- Matches variants by `manufacturerUpc`
- Updates each variant's `binLocation` field
- Preserves all other data (images, prices, descriptions, etc.)

**Expected output:**
```
📦 Starting bin location backfill...
✅ Loaded 408 products from seed file
✅ Connected to MongoDB
🚀 Processing bin locations...
  ✓ RHL#200 (90 vcp): null → 6/4 >*
  ✓ RHL#200 (180 vcp): null → 6/4 >*
  ...
✅ Backfill complete!
📊 Statistics:
  • Products processed: 408
  • Variants updated: 422
  • Variants with bin location in seed: 422
  • Variants skipped (no bin location): 62
```

### Step 3: Verify the Update

Check a sample product in MongoDB:

```javascript
db.products.findOne({ rhlId: 200 }).pretty()
```

You should see:

```javascript
{
  rhlId: 200,
  name: "Adrenal Rx Powder Capsules",
  variants: [
    {
      size: "90 vcp",
      itemNumber: "4017320",
      manufacturerUpc: "788332173202",
      price: 12.7,
      binLocation: "6/4 >*",  // ← Populated
      status: "active"
    },
    {
      size: "180 vcp",
      itemNumber: "4021090",
      manufacturerUpc: "788332210907",
      price: 21.4,
      binLocation: "6/4 >*",  // ← Populated
      status: "active"
    }
  ]
}
```

---

## API Endpoints

### 1. Get Catalog Products (with bin locations)

```
GET /api/user/catalog/products?page=1&limit=20
```

**Response includes bin locations:**
```json
{
  "success": true,
  "products": [
    {
      "rhlId": 200,
      "name": "Adrenal Rx Powder Capsules",
      "variants": [
        {
          "size": "90 vcp",
          "price": 12.7,
          "binLocation": "6/4 >*"
        },
        {
          "size": "180 vcp",
          "price": 21.4,
          "binLocation": "6/4 >*"
        }
      ]
    }
  ]
}
```

### 2. Warehouse Staff: Lookup Products by Bin Location

```
GET /api/user/warehouse/by-bin/:binLocation
```

**Example:**
```
GET /api/user/warehouse/by-bin/6%2F4%20%3E*
```

**Response:**
```json
{
  "success": true,
  "binLocation": "6/4 >*",
  "productsInBin": [
    {
      "rhlId": 200,
      "name": "Adrenal Rx Powder Capsules",
      "category": "FRESH GROUND VEGGIE CAPSULES",
      "variantsInBin": [
        { "size": "90 vcp", "binLocation": "6/4 >*" },
        { "size": "180 vcp", "binLocation": "6/4 >*" }
      ]
    },
    {
      "rhlId": 201,
      "name": "Aloe Vera Plus Powder Capsules",
      "category": "FRESH GROUND VEGGIE CAPSULES",
      "variantsInBin": [
        { "size": "60 vcp", "binLocation": "6/4 >*" }
      ]
    }
  ],
  "totalVariants": 3
}
```

---

## Data Status

### ✅ Assigned (422 variants)
- All major products have bin locations
- Format: `"6/4 >*"`, `"15/3 >*"`, etc.
- Ready for warehouse picking

### ⚠️ Unassigned (62 variants)
These are "Needs Review" items that need manual bin location assignment:
- Newer/Coming Soon SKUs
- Products with mismatched names/UPCs in source data
- Require manual warehouse review before assigning bins

**To assign a bin location manually:**

```javascript
db.products.updateOne(
  { "variants.manufacturerUpc": "SPECIFIC_UPC" },
  { $set: { "variants.$.binLocation": "7/2 >*" } }
)
```

---

## Files Modified / Created

### Modified Files
- **`Models/productModel.js`** — Added `binLocation` field to variantSchema
- **`Controllers/productController.js`** — Added `getProductsByBinLocation` endpoint
- **`Routes/userRoute.js`** — Added warehouse bin lookup route

### New Files
- **`backfill-bin-locations.js`** — Script to populate bin locations from seed file
- **`VARIANT_BIN_LOCATION_SETUP.md`** — This documentation

### Seed Data File
- **`rhl_products_with_bin_location.json`** — Updated seed file with bin locations per variant

---

## Troubleshooting

### Issue: Variants not found during backfill

**Possible causes:**
- Seed file UPCs don't match database UPCs
- Variant was added/removed after seed file generation
- Database has different data structure

**Solution:**
1. Check if variant exists manually:
   ```javascript
   db.products.findOne({ "variants.manufacturerUpc": "788332173202" })
   ```
2. Compare seed file UPC with database UPC
3. If UPC matches but variant not found, check variant schema version

### Issue: Some bin locations are null after backfill

**This is expected** — 62 variants don't have bin locations in the seed file. These require manual assignment.

To view unassigned variants:
```javascript
db.products.find({ "variants.binLocation": null }).count()
```

### Issue: Backfill script timeout

**If processing 408 products takes too long:**
- Increase Node.js heap: `node --max-old-space-size=4096 backfill-bin-locations.js`
- Or increase database connection timeout in script

---

## Frontend Integration

The bin location is already visible in the ProductLists component:

```jsx
<td className="col-location">
  <span className="bin-location">
    {product.variants?.[0]?.binLocation || "N/A"}
  </span>
</td>
```

To display all variant bin locations in a modal/detail view:

```jsx
{product.variants.map(v => (
  <div key={v.itemNumber}>
    {v.size}: {v.binLocation || 'Unassigned'}
  </div>
))}
```

---

## Next Steps

1. ✅ Run backfill script: `node backfill-bin-locations.js`
2. ✅ Verify API endpoints work
3. ⏳ Assign remaining 62 variants manually
4. ⏳ Deploy to production
5. ⏳ Test warehouse lookup endpoint with picking staff

---

## Support

For issues or questions about bin location implementation, contact the development team.
