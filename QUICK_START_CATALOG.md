# Quick Start — Product Catalog Backend

## TL;DR (5 Minutes)

```bash
# 1. Ensure MongoDB is running
# Check: MONGO_URI in .env

# 2. Optional: Migrate existing products
node migrate-to-new-product-schema.js

# 3. Import seed data (408 products)
node import-seed-data.js

# 4. Verify APIs work
curl http://localhost:5555/api/catalog/categories
curl http://localhost:5555/api/catalog/products?limit=5
curl http://localhost:5555/api/catalog/products/200
```

---

## What Was Updated?

✅ **Schema**: Products now have `rhlId`, `category`, `type`, `ingredients`, `variants[]`  
✅ **APIs**: 3 new endpoints for category-wise catalog  
✅ **Data**: 408 products + 484 variants ready to import  
✅ **Migration**: Safe script to update existing data  

---

## Files to Know

| File | Purpose |
|------|---------|
| `Models/productModel.js` | Updated schema |
| `migrate-to-new-product-schema.js` | Migrates existing products |
| `import-seed-data.js` | Imports 408 products from seed JSON |
| `Controllers/productController.js` | New endpoint functions |
| `Routes/userRoute.js` | New route handlers |
| `FRONTEND_INTEGRATION_GUIDE.md` | Detailed component updates (for frontend dev) |
| `IMPLEMENTATION_SUMMARY.md` | Complete documentation |

---

## New API Endpoints

### List Products (with filters)
```
GET /api/catalog/products
  ?category=FRESH GROUND VEGGIE CAPSULES
  &search=ashwagandha
  &page=1
  &limit=20
```

### Get All Categories
```
GET /api/catalog/categories
```

### Get Product Detail
```
GET /api/catalog/products/200
```

---

## Data Structure (at a glance)

```json
{
  "rhlId": 200,
  "name": "Adaptogen Vitality Complex",
  "category": "FRESH GROUND VEGGIE CAPSULES",
  "type": "Capsules- Fresh Ground",
  "description": "Supports stress resilience...",
  "ingredients": "157.5 mg Organic Eleuthero Root...",
  "variants": [
    {
      "size": "90 vcp",
      "itemNumber": "4017320",
      "price": 12.7,
      "manufacturerUpc": "788332173202"
    },
    {
      "size": "180 vcp",
      "itemNumber": "4021090",
      "price": 21.4,
      "manufacturerUpc": "788332210907"
    }
  ]
}
```

---

## Frontend Component Updates (Priority Order)

1. **Product Detail Page** — Display variants selector, ingredients
2. **Products List Page** — Add category filter
3. **Search** — Search now includes ingredients
4. **Cart** — Track variant itemNumber, not just product ID

See `FRONTEND_INTEGRATION_GUIDE.md` for full details.

---

## Checklist

- [ ] Confirm `.env` MONGO_URI is correct
- [ ] Run migration script (if you have existing products)
- [ ] Run import script
- [ ] Test `/api/catalog/categories`
- [ ] Test `/api/catalog/products?limit=5`
- [ ] Test `/api/catalog/products/200`
- [ ] Review `FRONTEND_INTEGRATION_GUIDE.md`
- [ ] Start frontend updates

---

## Common Issues

**Q: Import script fails to find seed file**  
A: Ensure `rhl-product-catalog-seed.json` is in `Ray-wholsell-1/` directory

**Q: MongoDB connection error**  
A: Check MONGO_URI in `.env` and ensure MongoDB service is running

**Q: "rhlId already exists" error**  
A: Normal on re-run; upsert will update existing products

**Q: Products have null prices**  
A: Import script will flag these; update source pricing data and re-run

---

## Next: Frontend Development

Once backend is ready, start updating frontend components:

1. Update product detail page to fetch by rhlId
2. Add variant selector (size/price chooser)
3. Display full ingredients list
4. Add category filter to products page
5. Update search to include ingredients
6. Test end-to-end

**See `FRONTEND_INTEGRATION_GUIDE.md` for code examples.**

---

**Status**: 🚀 Ready to go!
