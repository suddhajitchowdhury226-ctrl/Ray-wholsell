# RHL Product Image Upload API Guide

## Overview
Complete image management system for RHL products with upload, listing, reordering, and deletion capabilities.

---

## Schema: Product Images

Each product document now includes an `images` array:

```javascript
{
  rhlId: 200,
  name: "Adaptogen Vitality Complex",
  images: [
    {
      _id: ObjectId,
      url: "https://cdn.example.com/products/200-1234.jpg",
      key: "products/200-1234.jpg",          // for deletion
      altText: "Adaptogen Vitality Complex",
      isPrimary: true,                        // only ONE per product
      order: 0,
      uploadedAt: "2026-09-14T12:00:00.000Z"
    }
  ]
}
```

---

## API Endpoints

### 1. GET `/api/user/products/:productId/images`

**List all images for a product**

#### Request
```bash
curl -X GET https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images
```

#### Response (200 OK)
```json
{
  "rhlId": 200,
  "name": "Adaptogen Vitality Complex",
  "category": "FRESH GROUND VEGGIE CAPSULES",
  "totalImages": 2,
  "images": [
    {
      "_id": "670b1234567890abcdef1234",
      "url": "/uploads/products/200-1234-adaptogen.jpg",
      "key": "200-1234-adaptogen.jpg",
      "altText": "Adaptogen Vitality Complex 90 caps",
      "isPrimary": true,
      "order": 0,
      "uploadedAt": "2026-09-14T12:00:00.000Z"
    },
    {
      "_id": "670b5678901234567890abcd",
      "url": "/uploads/products/200-5678-adaptogen-180.jpg",
      "key": "200-5678-adaptogen-180.jpg",
      "altText": "Adaptogen Vitality Complex 180 caps",
      "isPrimary": false,
      "order": 1,
      "uploadedAt": "2026-09-14T12:05:00.000Z"
    }
  ]
}
```

---

### 2. POST `/api/user/products/:productId/images`

**Upload a new image**

#### Request (multipart/form-data)
```bash
curl -X POST https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images \
  -F "image=@/path/to/image.jpg" \
  -F "altText=Adaptogen Vitality Complex 90 veggie caps"
```

#### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `image` | File | Yes | JPEG, PNG, or WebP (max 5MB) |
| `altText` | String | No | Alt text for accessibility (defaults to product name) |

#### Response (201 Created)
```json
{
  "message": "Image uploaded successfully",
  "image": {
    "_id": "670b9abc123456789abcdef0",
    "url": "/uploads/products/200-1726342800-image.jpg",
    "key": "200-1726342800-image.jpg",
    "altText": "Adaptogen Vitality Complex 90 veggie caps",
    "isPrimary": true,
    "order": 0,
    "uploadedAt": "2026-09-14T12:15:00.000Z"
  }
}
```

#### Error Responses
- **400**: No image file provided or invalid file type
- **404**: Product not found
- **413**: File exceeds 5MB limit
- **500**: Server error

---

### 3. PATCH `/api/user/products/:productId/images/:imageId`

**Update image metadata (altText, isPrimary, order)**

#### Request
```bash
curl -X PATCH https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images/670b1234567890abcdef1234 \
  -H "Content-Type: application/json" \
  -d '{
    "altText": "Updated alt text",
    "isPrimary": true,
    "order": 0
  }'
```

#### Body Parameters (all optional)
| Name | Type | Description |
|------|------|-------------|
| `altText` | String | Update accessibility text |
| `isPrimary` | Boolean | Set as primary (clears others) |
| `order` | Number | Display order (0 = first) |

#### Response (200 OK)
```json
{
  "message": "Image updated successfully",
  "image": {
    "_id": "670b1234567890abcdef1234",
    "url": "/uploads/products/200-1234-adaptogen.jpg",
    "key": "200-1234-adaptogen.jpg",
    "altText": "Updated alt text",
    "isPrimary": true,
    "order": 0,
    "uploadedAt": "2026-09-14T12:00:00.000Z"
  }
}
```

#### Notes
- Setting `isPrimary: true` automatically sets all other images to `false`
- Use `order` to reorder images (lower = first)

---

### 4. DELETE `/api/user/products/:productId/images/:imageId`

**Delete an image**

#### Request
```bash
curl -X DELETE https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images/670b1234567890abcdef1234
```

#### Response (200 OK)
```json
{
  "message": "Image deleted successfully"
}
```

#### Behavior
- Image file removed from disk (`/uploads/products/`)
- Image document removed from MongoDB
- If deleted image was primary, first remaining image becomes primary
- Error responses: 404 (product/image not found), 500 (server error)

---

## Complete Upload Workflow Example

### Step 1: Upload first image (auto-becomes primary)
```bash
curl -X POST https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images \
  -F "image=@product-90caps.jpg" \
  -F "altText=90 veggie capsules"
# Response: { isPrimary: true, order: 0 }
```

### Step 2: Upload second image
```bash
curl -X POST https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images \
  -F "image=@product-180caps.jpg" \
  -F "altText=180 veggie capsules"
# Response: { isPrimary: false, order: 1 }
```

### Step 3: List images to get IDs
```bash
curl -X GET https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images
# Returns array with _id values
```

### Step 4: Reorder - make second image primary
```bash
curl -X PATCH https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images/670b5678901234567890abcd \
  -H "Content-Type: application/json" \
  -d '{ "isPrimary": true }'
# Response: second image now primary, first image no longer primary
```

### Step 5: Delete an image
```bash
curl -X DELETE https://ray-wholsell.onrender.com/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images/670b1234567890abcdef1234
# Response: image deleted, if it was primary, 670b5678901234567890abcd becomes primary
```

---

## Constraints & Validation

| Constraint | Value |
|-----------|-------|
| Max file size | 5 MB |
| Allowed types | JPEG, PNG, WebP |
| Max images per product | Unlimited |
| Primary images per product | Exactly 1 (enforced) |
| Image order | 0-indexed, auto-incrementing |

---

## Error Handling

### Common Error Scenarios

**400 Bad Request** - No file or wrong file type
```json
{ "error": "No image file provided" }
{ "error": "Invalid file type. Allowed: image/jpeg, image/png, image/webp" }
```

**404 Not Found** - Product or image doesn't exist
```json
{ "error": "Product not found" }
{ "error": "Image not found" }
```

**413 Payload Too Large** - File exceeds limit
```json
{ "error": "File size exceeds 5MB limit" }
```

**500 Internal Server Error** - Server issue
```json
{ "error": "error message details" }
```

---

## Integration Notes

### File Storage
- **Dev/Staging**: Local disk (`/uploads/products/`)
- **Production**: S3 or CDN (configure in controller)

### Database
- Images stored as subdocuments in Product collection
- Each image has unique MongoDB `_id` for targeting updates/deletes
- Indexed by `rhlId` for fast lookups

### Frontend Integration
- Use multipart/form-data for uploads
- Store returned `_id` for updates/deletes
- Display `isPrimary` to highlight featured image
- Sort by `order` field for display order

---

## Postman Collection Example

```json
{
  "info": { "name": "RHL Product Images" },
  "item": [
    {
      "name": "List Images",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/user/products/{{productId}}/images"
      }
    },
    {
      "name": "Upload Image",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/user/products/{{productId}}/images",
        "body": {
          "mode": "formdata",
          "formdata": [
            { "key": "image", "type": "file", "value": "@image.jpg" },
            { "key": "altText", "value": "Product image" }
          ]
        }
      }
    },
    {
      "name": "Update Image",
      "request": {
        "method": "PATCH",
        "url": "{{base_url}}/api/user/products/{{productId}}/images/{{imageId}}",
        "body": { "mode": "raw", "raw": "{\"isPrimary\": true}" }
      }
    },
    {
      "name": "Delete Image",
      "request": {
        "method": "DELETE",
        "url": "{{base_url}}/api/user/products/{{productId}}/images/{{imageId}}"
      }
    }
  ]
}
```

---

## Testing

### Unit Test Example (Jest)
```javascript
describe('Product Image API', () => {
  it('should upload an image', async () => {
    const response = await request(app)
      .post('/api/user/products/670a1b2c3d4e5f6g7h8i9j0k/images')
      .field('altText', 'Test image')
      .attach('image', 'test.jpg');
    
    expect(response.status).toBe(201);
    expect(response.body.image.isPrimary).toBe(true);
  });
});
```

---

**API Version:** 1.0  
**Last Updated:** 2026-09-14  
**Backend:** Render (ray-wholsell.onrender.com)
