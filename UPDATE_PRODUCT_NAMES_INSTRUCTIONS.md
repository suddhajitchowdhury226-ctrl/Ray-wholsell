# Update Product Names from New Seed File

## Problem
Product names in the database are old. The new seed file `rhl_products_with_bin_location.json` has updated names that need to be synced to MongoDB.

**Example Changes:**
- Old: "Chuan Xin Lian Andrographis" → New: "Andrographis Powder Capsules"
- Old: "Organic Apple Cider Vinegar" → New: "Apple Cider Vinegar Powder Capsules"
- Old: "Withanolide Ashwagandha" → New: "Ashwagandha Powder Capsules"

## Solution

### Step 1: Run the Update Script

```bash
cd Ray-wholsell-1
npm run update-names
```

Or manually:
```bash
node update-product-names.js
```

### Step 2: Expected Output

```
📝 Starting product name update...
✅ Loaded 408 products from seed file
✅ Connected to MongoDB
🚀 Updating product names...

✓ RHL#200:
  Old: "Adrenal Rx Powder Capsules"
  New: "Adrenal Rx Powder Capsules"

✓ RHL#202:
  Old: "Chuan Xin Lian Andrographis"
  New: "Andrographis Powder Capsules"

✓ RHL#203:
  Old: "Organic Apple Cider Vinegar"
  New: "Apple Cider Vinegar Powder Capsules"

✓ RHL#204:
  Old: "Withanolide Ashwagandha"
  New: "Ashwagandha Powder Capsules"

✅ Update complete!
📊 Statistics:
  • Products processed: 408
  • Names updated: XX
  • Names unchanged: XX
  • Products not found: 0
  • Errors: 0
```

### Step 3: Verify on Frontend

After running the script:
1. Restart the frontend app
2. Clear browser cache (Ctrl+Shift+Delete)
3. Visit `/products` page
4. Products should now show **NEW names**

---

## What the Script Does

✅ Reads `rhl_products_with_bin_location.json`  
✅ Matches products by `rhlId`  
✅ Updates product names if different  
✅ Shows before/after for each changed name  
✅ Preserves all other data (prices, descriptions, images, etc.)  
✅ Safe to run multiple times (idempotent)  

---

## Quick Fix if Frontend Still Shows Old Names

1. **Backend**: Verify names updated
   ```bash
   npm run update-names
   ```

2. **Frontend Cache**: Clear it
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or open DevTools → Network → Disable Cache → Refresh

3. **API Response**: Check what backend sends
   ```bash
   curl http://localhost:3000/api/user/catalog/products | grep name
   ```

4. **Rebuild**: If still showing old names after clear cache
   ```bash
   cd Ray-Wholsell
   npm run build
   npm run dev
   ```

---

## Files Modified

- `Ray-wholsell-1/update-product-names.js` — New update script
- `Ray-wholsell-1/package.json` — Added `npm run update-names` command
- `Ray-wholsell-1/import-seed-data.js` — Enhanced to include binLocation mapping

---

## Troubleshooting

**Q: Script says "0 names updated" but I see old names on frontend?**
A: The names might already be correct in DB. Check:
```javascript
db.products.findOne({ rhlId: 202 }).name
// Should show: "Andrographis Powder Capsules"
```

**Q: Error connecting to MongoDB?**
A: Check `.env` file has correct MONGO_URI:
```
DATABASE_URL=mongodb://localhost:27017/rayWholeSale
```

**Q: Frontend still shows old names after script?**
A: Clear browser cache completely:
- DevTools → Application → Clear Site Data
- Or use incognito/private window

---

## One-Time Setup (Complete)

```bash
# 1. Update names
npm run update-names

# 2. Backfill bin locations (if not done)
npm run backfill-bin-locations

# 3. Verify
npm start
```

Then update frontend and you're done! ✅
