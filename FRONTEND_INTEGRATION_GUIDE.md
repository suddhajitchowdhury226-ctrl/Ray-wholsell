# Frontend Integration Guide — Category-wise Product Catalog

## Overview
The backend now supports a category-wise product catalog with ingredients, variants (sizes/prices), and wholesale pricing. This document flags which frontend components need updating to consume the new fields and endpoints.

---

## New Backend APIs

### 1. **GET `/api/catalog/products`** ✨ NEW
- **Purpose**: Fetch products with category filtering and search
- **Query Parameters**:
  - `category` (optional): Filter by category name (e.g., `FRESH GROUND VEGGIE CAPSULES`)
  - `search` (optional): Search in name, ingredients, or description
  - `page` (default: 1): Pagination page number
  - `limit` (default: 20): Products per page
- **Response**:
  ```json
  {
    "success": true,
    "products": [
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
            "rhlUpc": null,
            "manufacturerUpc": "788332173202",
            "price": 12.7,
            "status": "active"
          }
        ],
        "status": "active"
      }
    ],
    "totalProducts": 408,
    "currentPage": 1,
    "totalPages": 21,
    "pageSize": 20
  }
  ```

### 2. **GET `/api/catalog/categories`** ✨ NEW
- **Purpose**: Fetch distinct categories with product/variant counts (for building category nav)
- **Query Parameters**: None
- **Response**:
  ```json
  {
    "success": true,
    "categories": [
      {
        "name": "FRESH GROUND VEGGIE CAPSULES",
        "productCount": 145,
        "variantCount": 234
      },
      {
        "name": "HERBAL LIQUIDS & EXTRACTS",
        "productCount": 89,
        "variantCount": 112
      }
    ],
    "totalCategories": 28
  }
  ```

### 3. **GET `/api/catalog/products/:rhlId`** ✨ NEW
- **Purpose**: Fetch full product detail including all variants, ingredients, and metadata
- **Response**:
  ```json
  {
    "success": true,
    "product": {
      "rhlId": 200,
      "name": "Adaptogen Vitality Complex",
      "manufacturerName": "Adrenal Rx Powder Capsules",
      "category": "FRESH GROUND VEGGIE CAPSULES",
      "type": "Capsules- Fresh Ground",
      "description": "Supports stress resilience, relaxation & vitality.",
      "ingredients": "157.5 mg Organic Eleuthero Root, 157.5 mg Organic Ashwagandha Root...",
      "status": "active",
      "variants": [
        {
          "size": "90 vcp",
          "itemNumber": "4017320",
          "rhlUpc": null,
          "manufacturerUpc": "788332173202",
          "price": 12.7,
          "status": "active"
        },
        {
          "size": "180 vcp",
          "itemNumber": "4021090",
          "rhlUpc": null,
          "manufacturerUpc": "788332210907",
          "price": 21.4,
          "status": "active"
        }
      ]
    }
  }
  ```

---

## Frontend Components Requiring Updates

### 🔴 **HIGH PRIORITY**

#### 1. **Products Page** (`Ray-Wholsell/src/Pages/Products.jsx`)
**Current State**: Uses ProductLists component with pagination

**Changes Needed**:
- Add category filter UI (dropdown or sidebar)
- Integrate `/api/catalog/categories` to populate filter options
- Update product fetch to use `/api/catalog/products?category=X`
- Display variants (sizes/prices) for each product
- Show ingredients on product card or detail view

**Files to Update**:
- `src/Pages/Products.jsx` — Add category filter state and logic
- `src/components/ProductPage/ProductLists/ProductLists.jsx` — Update API call and product rendering

---

#### 2. **Product Detail Page** (`Ray-Wholsell/src/Pages/ProductDetails.jsx`)
**Current State**: Shows single product info

**Changes Needed**:
- Fetch product by `rhlId` using `/api/catalog/products/:rhlId`
- Display **all variants** (sizes, prices, UPCs) in a selector/table
- Add **ingredients section** prominently
- Add **manufacturer info** if available
- Show wholesale prices (from `variants[].price`)
- Allow user to select variant (size) before adding to cart

**Files to Update**:
- `src/Pages/ProductDetails.jsx` — Refetch using rhlId, display ingredients
- Likely need variant selector component (new or modified)

---

#### 3. **Product Card Component** (in ProductLists or similar)
**Current State**: Displays product name, price, image, basic info

**Changes Needed**:
- Show **category** as badge or label
- Display **variants count** (e.g., "2 sizes available")
- Optionally show first variant's price, or price range
- Add **type** as secondary label (e.g., "Capsules- Fresh Ground")
- Link to `/products/:rhlId` detail page using rhlId

---

### 🟡 **MEDIUM PRIORITY**

#### 4. **Home Page Product Section** (`Ray-Wholsell/src/Pages/Home.jsx`)
**Current State**: Shows featured/short products

**Changes Needed**:
- If displaying products, switch to new API: `/api/catalog/products?limit=6`
- Update product links to use rhlId
- Show category/type info on featured products
- Optionally show ingredients snippet

---

#### 5. **Search Feature** (Navbar component or dedicated search)
**Current State**: Likely searches in generic product API

**Changes Needed**:
- Update search to use `/api/catalog/products?search=query`
- Search now includes ingredients (backend already supports this)
- Display category in search results for context
- Link results to product detail by rhlId

---

#### 6. **Cart & Checkout** (Cart component)
**Current State**: Stores items with product ID

**Changes Needed**:
- Store **variant itemNumber** (not just product ID) to ensure size/price tracking
- Display variant **size** when showing cart items
- Display **wholesale price** (from variant data)
- Ensure order confirmation shows correct variant price

**Files to Potentially Update**:
- `src/components/common/Navbar/Navbar.jsx` — Cart display
- `src/components/CartPage/` (if exists) — Cart item display

---

### 🟢 **LOW PRIORITY**

#### 7. **Admin Panel** (if admin can manage products)
**Current State**: May have product management UI

**Changes Needed**:
- Display/edit `rhlId`, `category`, `type`, `ingredients`
- Manage **variants** (add/edit sizes and prices)
- Bulk upload should map to new schema

---

## Data Mapping Reference

### Old Product Fields → New Fields
| Old | New | Notes |
|-----|-----|-------|
| `_id` | `rhlId` | Use rhlId as primary identifier for catalog |
| `name` | `name` | Same, display name |
| `description` | `description` | Short marketing description |
| `ingredient` | `ingredients` | Full ingredients list (now prominent) |
| `category` (ObjectId ref) | `category` (string) | Now a string, e.g., "FRESH GROUND VEGGIE CAPSULES" |
| `productForm` | `type` | Product sub-type, e.g., "Capsules- Fresh Ground" |
| `sellPrice` / `wholesaleSellPrice` | `variants[].price` | Price now per-variant (per size) |
| `sku` | `variants[].itemNumber` | Item number per size variant |
| (not tracked) | `variants[].rhlUpc` | Our UPC barcode |
| (not tracked) | `variants[].manufacturerUpc` | Manufacturer barcode |

### URLs to Update
- **Product link**: `products/[_id]` → `products/[rhlId]` or `catalog/[rhlId]`
- **Category filter**: Build from `/api/catalog/categories`
- **Product list**: Use `/api/catalog/products?category=X`

---

## Implementation Checklist

- [ ] **Products Page**: Add category filter UI
- [ ] **Products Page**: Update API call to `/api/catalog/products`
- [ ] **Product Card**: Display category, type, variants count
- [ ] **Product Detail**: Fetch by rhlId, display all variants
- [ ] **Product Detail**: Add ingredients section
- [ ] **Product Detail**: Add variant selector (size/price chooser)
- [ ] **Search**: Update to new API endpoint
- [ ] **Cart**: Track variant itemNumber, not just product ID
- [ ] **Cart Display**: Show size/variant name
- [ ] **Checkout**: Use correct variant price
- [ ] **Home Page**: Update product links to rhlId
- [ ] **Admin**: Update product management if applicable

---

## Testing Checklist

1. **Fetch Endpoints**:
   - [ ] GET `/api/catalog/categories` returns all categories
   - [ ] GET `/api/catalog/products` returns paginated products
   - [ ] GET `/api/catalog/products?category=X` filters correctly
   - [ ] GET `/api/catalog/products?search=ashwagandha` searches by name/ingredients
   - [ ] GET `/api/catalog/products/:rhlId` returns full product detail

2. **Frontend UI**:
   - [ ] Category filter dropdown/sidebar populates from API
   - [ ] Clicking category filters product list
   - [ ] Product cards show category, type, variant count
   - [ ] Product detail shows all variants with sizes and prices
   - [ ] Product detail shows full ingredients list
   - [ ] Variant selector allows choosing size and updates price
   - [ ] Search results include ingredients and highlight matches
   - [ ] Add to cart captures correct variant/size
   - [ ] Cart displays size name and correct price

3. **Data Integrity**:
   - [ ] Prices in cart match variant prices from product detail
   - [ ] Product links work (no 404s)
   - [ ] Images still display (if migrated)
   - [ ] Pagination works smoothly

---

## Example Component Updates

### ProductLists.jsx — Update API Call
```javascript
// OLD
const response = await axios.get(`${BASE_URL}/api/wholesaler/get-products?role=wholesaler`);

// NEW
const response = await axios.get(`${BASE_URL}/api/catalog/products`, {
  params: {
    category: selectedCategory,  // If filtered
    search: searchQuery,           // If searching
    page: currentPage,
    limit: 10
  }
});
```

### ProductCard.jsx — Display New Fields
```javascript
// OLD
<p>{product.description}</p>
<span>${product.sellPrice}</span>

// NEW
<p>{product.category}</p>
<p className="type">{product.type}</p>
<p>{product.description}</p>
<span>{product.variants.length} sizes available</span>
<span className="price-range">
  ${Math.min(...product.variants.map(v => v.price))} - 
  ${Math.max(...product.variants.map(v => v.price))}
</span>
```

### ProductDetail.jsx — Variants Selector
```javascript
// NEW: Add variant selector
<div className="variants">
  <h3>Available Sizes</h3>
  {product.variants.map(variant => (
    <button 
      key={variant.itemNumber}
      onClick={() => setSelectedVariant(variant)}
      className={selectedVariant?.itemNumber === variant.itemNumber ? 'active' : ''}
    >
      {variant.size} — ${variant.price}
    </button>
  ))}
</div>

// NEW: Display ingredients
<div className="ingredients">
  <h3>Ingredients</h3>
  <p>{product.ingredients}</p>
</div>
```

---

## Rollout Plan

1. **Phase 1**: Update product detail page (most critical)
   - Implement variant selector
   - Display ingredients
   - Test cart integration

2. **Phase 2**: Update products list page
   - Add category filter
   - Update product cards
   - Verify pagination

3. **Phase 3**: Update search and secondary features
   - Search integration
   - Home page updates
   - Admin updates

4. **Phase 4**: Testing & QA
   - End-to-end testing
   - Mobile/responsive testing
   - Performance testing with 408 products

---

## Support Notes

- **Backwards Compatibility**: Old API endpoints still work; legacy fields preserved in DB
- **Variant Pricing**: All prices now per-variant (per size); use `variants[].price` for display/cart
- **Item Tracking**: Use `variants[].itemNumber` as unique identifier for order fulfillment
- **Search**: Now includes ingredients for better discoverability
- **Categories**: 28 distinct categories; consider lazy-loading if building dropdown

---

**Status**: 🔄 Ready for frontend integration  
**Next Step**: Begin with Product Detail page to test new API and variant handling
