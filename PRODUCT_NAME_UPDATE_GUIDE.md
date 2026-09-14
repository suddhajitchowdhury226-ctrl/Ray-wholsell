# Product Name Update Guide

## Overview

This guide explains how to update all product names from old generic names to new **RHL Product Names** for better branding and clarity.

## What's Being Updated

**Example Updates:**
- Old: `Adrenal Rx Powder Capsules` → New: `Adaptogen Vitality Complex`
- Old: `Aloe Vera Plus Powder Capsules` → New: `Aloe Digestive Comfort`
- Old: `Ashwagandha Powder Capsules` → New: `Withanolide Ashwagandha`
- Old: `Brain Mushroom Support COG Powder Capsules` → New: `Cognitive Focus Complex`

**Total Updates:** 150+ product names across all categories

## How to Run the Update

### Step 1: Pull Latest Code
```bash
cd Ray-wholsell-1
git pull origin main
```

### Step 2: Run the Update Script
```bash
node update-product-names.js
```

**Expected Output:**
```
📝 Starting product name update...
✅ Connected to MongoDB
🚀 Updating product names...
  ✓ Updated: "Adrenal Rx Powder Capsules" → "Adaptogen Vitality Complex"
  ✓ Updated: "Aloe Vera Plus Powder Capsules" → "Aloe Digestive Comfort"
  ✓ Updated: "Ashwagandha Powder Capsules" → "Withanolide Ashwagandha"
  ...
✅ Update complete!
📊 Statistics:
  • Products updated: 150
  • Products not found: 0
  • Errors: 0
```

**Time to complete:** ~30 seconds

### Step 3: Verify Frontend Update

Restart the frontend and navigate to Products page:
```bash
cd Ray-Wholsell
npm start
```

Check that product names display the new branding names.

## Product Categories Updated

### ✅ Powder Capsules (80+ products)
- Adaptogen, Herbal, Vitamin complexes
- All now use branded RHL names

### ✅ Liquid Capsules (18 products)
- Sleep, Stress, Immune formulas
- Updated with new naming convention

### ✅ Liquid Extracts (120+ products)
- Single herbs and botanical complexes
- Branded with standardization indicators

### ✅ Herbal Formulas (80+ products)
- Specialty blends with health benefits
- Descriptive functional names

### ✅ CBD Products (7 products)
- Full Spectrum, Broad Spectrum
- Clear potency labeling

### ✅ Vitamins & Minerals (20 products)
- B Complex, D3, Minerals
- Standardized naming

### ✅ Kids Formulas (9 products)
- Age-appropriate naming
- Clear therapeutic benefits

### ✅ Herbs & Powders (16 products)
- Organic, standardized formulations
- Source-specific naming

### ✅ Oils & Extracts (6+ categories)
- Carrier Oils
- Essential Oils
- Herbal Oils
- Mushroom Powders

## Database Changes

### Before Update
```javascript
{
  rhlId: 200,
  name: "Adrenal Rx Powder Capsules",
  category: "FRESH GROUND VEGGIE CAPSULES",
  variants: [...]
}
```

### After Update
```javascript
{
  rhlId: 200,
  name: "Adaptogen Vitality Complex",
  category: "FRESH GROUND VEGGIE CAPSULES",
  variants: [...]
}
```

## Frontend Impact

### Product Lists Page
- All product names updated in table display
- Search functionality continues to work
- Product cards show new branding names

### Product Details Modal
- Modal title displays new product name
- All variant information preserved
- Price, description, ingredients unchanged

### Catalog API
- GET `/api/user/catalog/products` returns new names
- Product detail endpoints updated
- Backward compatible with existing integrations

## If Update Fails

### Issue: Script Can't Connect to Database
**Solution:**
```bash
# Check MONGO_URI in .env
cat .env | grep MONGO
# Ensure MongoDB is running
# Re-run: node update-product-names.js
```

### Issue: Some Products Not Found
**This is normal** if:
- Product was already updated
- Product name has a typo in the database
- Product has been deleted

**Check which products updated:**
```bash
# Look at script output statistics
# Products not found = 0 means all were updated
```

### Issue: Need to Rollback

**To revert to old names:**
```bash
# Manually update in MongoDB, or
# Run update script with reversed mapping
# (contact dev team for rollback script)
```

## Verification Checklist

After running the update script:

- [ ] Script completed with 0 errors
- [ ] 150+ products were updated
- [ ] Frontend displays new product names
- [ ] Search still works with new names
- [ ] Product cards show correct branding
- [ ] Catalog API returns new names
- [ ] No duplicate product names
- [ ] All variants still show correctly

## Files Modified

- `Ray-wholsell-1/update-product-names.js` — Update script
- `Ray-wholsell-1/PRODUCT_NAME_UPDATE_GUIDE.md` — This guide
- MongoDB `products` collection — Product names updated

## Related Documentation

- **Bin Location Setup**: `VARIANT_BIN_LOCATION_SETUP.md`
- **Quick Start**: `QUICK_START_BIN_LOCATIONS.md`
- **Schema Changes**: `Models/productModel.js`

## Support

For issues with the product name update:
1. Check MongoDB connection
2. Verify MONGO_URI in .env
3. Check script output for specific errors
4. Contact development team if needed

---

**Update Deployed:** ✅ Ready to run
**Last Updated:** August 25, 2026
