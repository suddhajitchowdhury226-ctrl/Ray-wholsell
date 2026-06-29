const blogSchema = require("../Models/blogSchema");
const brandModel = require("../Models/brandModel");
const categoryModel = require("../Models/categoryModel");
const retailerCategoryModel = require("../Models/retailerCategoryModel");
const productModel = require("../Models/productModel");
const purchaseModel = require("../Models/purchaseModel");
const subcategoryModel = require("../Models/subcategoryModel");
const retailerSubcategoryModel = require("../Models/retailerSubcategoryModel");
const user = require("../Models/user");
const mongoose = require("mongoose");

// const createCategory = async (req, res) => {
//   try {
//     const { name } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ message: 'Category image is required' });
//     }

//     const category = await categoryModel.create({
//       name,
//       image: req.file.path,
//       createdBy: req.user._id,
//     });

//     res.status(201).json(category);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const getCategories = async (req, res) => {
//   try {
//     const categories = await categoryModel.find().populate('createdBy', 'name');
//     res.status(200).json(categories);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const updateCategory = async (req, res) => {
//   try {
//     const { name } = req.body;

//     const updateData = { name };
//     if (req.file) {
//       updateData.image = req.file.path;
//     }

//     const category = await categoryModel.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!category) {
//       return res.status(404).json({ message: 'Category not found' });
//     }

//     res.status(200).json(category);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const deleteCategory = async (req, res) => {
//   try {
//     const category = await categoryModel.findByIdAndDelete(req.params.id);
//     if (!category) {
//       return res.status(404).json({ message: 'Category not found' });
//     }
//     res.status(200).json({ message: 'Category deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// Create Category
const createCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // console.log("req.user2",req.user)

    // Validate category name
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Create the category first
    const categoryData = {
      name,
      createdBy: req.user._id,
      subcategories: [], // Initialize with empty array
    };

    // Add image if provided
    if (req.file) {
      categoryData.image = req.file.path;
    }

    const category = await categoryModel.create(categoryData);

    // Parse and create subcategories if provided
    let subcategoryIds = [];
    if (subcategories) {
      let subcategoryNames;
      try {
        subcategoryNames = JSON.parse(subcategories);
        if (!Array.isArray(subcategoryNames)) {
          throw new Error('Subcategories must be an array');
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid subcategories format' });
      }

      // Validate subcategory names
      if (subcategoryNames.length > 0) {
        for (const subName of subcategoryNames) {
          if (typeof subName !== 'string' || subName.trim().length < 2) {
            return res.status(400).json({ message: 'Each subcategory name must be a string with at least 2 characters' });
          }
          const subcategory = await subcategoryModel.create({
            name: subName.trim(),
            category: category._id, // Set the category ID immediately
            createdBy: req.user._id,
          });
          subcategoryIds.push(subcategory._id);
        }

        // Update the category with subcategory IDs
        category.subcategories = subcategoryIds;
        await category.save();
      }
    }

    // Populate subcategories for response
    const populatedCategory = await categoryModel
      .findById(category._id)
      .populate('subcategories', 'name')
      .populate('createdBy', 'name');

    res.status(201).json(populatedCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ message: error.message || 'Failed to create category' });
  }
};

// Get Categories
const getCategories = async (req, res) => {
  try {
    const categories = await categoryModel
      .find()
      .populate('createdBy', 'name')
      .populate('subcategories', 'name');
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Validate category name
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // req.user logged at auth middleware level

    // Validate req.user
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Prepare update data
    const updateData = { name };
    if (req.file) {
      updateData.image = req.file.path;
    }

    // Parse and update subcategories if provided
    if (subcategories) {
      let subcategoryNames;
      try {
        subcategoryNames = JSON.parse(subcategories);
        if (!Array.isArray(subcategoryNames)) {
          return res.status(400).json({ message: 'Subcategories must be an array' });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid subcategories format' });
      }

      // Validate subcategory names
      for (const subName of subcategoryNames) {
        if (typeof subName !== 'string' || subName.trim().length < 2) {
          return res.status(400).json({ message: 'Each subcategory name must be a string with at least 2 characters' });
        }
      }

      // Get existing subcategories
      const existingSubcategories = await subcategoryModel.find({ category: req.params.id });

      // Delete subcategories that are no longer in the list
      const newSubcategoryNames = new Set(subcategoryNames.map(name => name.trim()));
      for (const existingSub of existingSubcategories) {
        if (!newSubcategoryNames.has(existingSub.name)) {
          await subcategoryModel.findByIdAndDelete(existingSub._id);
        }
      }

      // Add or update subcategories
      const subcategoryIds = [];
      for (const subName of newSubcategoryNames) {
        let subcategory = await subcategoryModel.findOne({
          name: subName,
          category: req.params.id
        });
        if (!subcategory) {
          try {
            subcategory = await subcategoryModel.create({
              name: subName,
              category: req.params.id,
              createdBy: req.user._id,
            });
          } catch (error) {
            return res.status(400).json({ message: `Failed to create subcategory '${subName}': ${error.message}` });
          }
        }
        if (subcategory && subcategory._id) {
          subcategoryIds.push(subcategory._id);
        } else {
          return res.status(500).json({ message: `Failed to process subcategory '${subName}'` });
        }
      }
      updateData.subcategories = subcategoryIds;
    }

    // Update the category
    const category = await categoryModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('subcategories', 'name').populate('createdBy', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ message: error.message || 'Failed to update category' });
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete associated subcategories
    await subcategoryModel.deleteMany({ category: req.params.id });

    await categoryModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Category and its subcategories deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





// Create Brand
const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const brand = await brandModel.create({
      name,
      createdBy: req.user._id,
    });
    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Brands
const getBrands = async (req, res) => {
  try {
    const brands = await brandModel.find().populate('createdBy', 'name');
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Brand
const updateBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const brand = await brandModel.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    res.status(200).json(brand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Brand
const deleteBrand = async (req, res) => {
  try {
    const brand = await brandModel.findByIdAndDelete(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    res.status(200).json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};










const getRetailerPurchases = async (req, res) => {
  try {
    const userId = req.user._id; // Logged-in user's ID
    const userRole = req.user.role; // Get user role (retailer or wholesaler)

    logger.info('Fetching purchases', { path: 'getRetailerPurchases' });

    // Get user info with commission
    const userInfo = await user.findById(userId).select('name email commission role').lean();
    if (!userInfo) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all purchases with required population
    const purchases = await purchaseModel
      .find({})
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.product',
        select: 'name sku item_number brand bin_location reorder supplierName createdBy',
        populate: {
          path: 'brand',
          select: 'name'
        }
      })
      .populate('user', 'name email addresses')
      .populate('shipment')
      .lean();

    // Filter purchases based on user role and websiteRole
    const targetWebsiteRole = userRole === 'retailer' ? 'retailer' : 'wholesaler';

    // userId logged at auth level;
    // role filtering in progress;

    const filteredPurchases = purchases.filter(purchase =>
      purchase.items.some(item => {
        const matches = item.product?.createdBy?.toString() === userId.toString() &&
          item.websiteRole === targetWebsiteRole;

        if (item.product?.name?.includes('ZZZ')) {
          
          
          
          
          
          
        }

        return matches;
      })
    );

    // Process purchases to filter items and recalculate totals
    const processedPurchases = filteredPurchases.map(purchase => {
      // Filter items to only include those belonging to the current user with correct websiteRole
      const userItems = purchase.items.filter(item =>
        item.product?.createdBy?.toString() === userId.toString() &&
        item.websiteRole === targetWebsiteRole
      );

      // Add displayName with variant to each item
      const itemsWithDisplayName = userItems.map(item => {
        let displayName = item.product?.name || 'Unknown Product';
        if (item.variantName) {
          displayName = `${item.product?.name || 'Unknown Product'} - ${item.variantName}`;
        }
        return {
          ...item,
          displayName: displayName,
          // Also update product name for backwards compatibility
          product: item.product ? {
            ...item.product,
            displayName: displayName
          } : null
        };
      });

      // Recalculate total for user's items only (price is unit price, so multiply by quantity)
      const userTotal = userItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

      // Calculate shipping cost proportionally based on user's items
      const totalItemsValue = purchase.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
      const userShippingCost = totalItemsValue > 0 ?
        (purchase.shippingCost || 0) * (userTotal / totalItemsValue) : 0;

      let shippingAddress = null;
      if (purchase.user && purchase.user.addresses && purchase.address) {
        // Find the address by ID from user.addresses array
        shippingAddress = purchase.user.addresses.find(addr => addr._id.toString() === purchase.address.toString());
      }

      return {
        ...purchase,
        items: itemsWithDisplayName, // Use items with displayName
        total: userTotal, // Recalculated total for user's items
        shippingCost: userShippingCost, // Proportional shipping cost
        originalTotal: purchase.total, // Keep original total for reference
        originalShippingCost: purchase.shippingCost, // Keep original shipping cost for reference
        address: shippingAddress || null,
        shipmentDetails: purchase.shipment || null,
      };
    });

    res.status(200).json({
      message: 'User purchase history retrieved',
      purchases: processedPurchases,
      retailer: userInfo, // Include user info with commission
    });
  } catch (error) {
    console.error('[ERROR] getRetailerPurchases:', error);
    res.status(500).json({ message: 'Error fetching purchase history' });
  }
};




const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];
    const blog = await blogSchema.create({
      title,
      content,
      images,
      author: req.user._id,
      websiteRole: req.user.role
    });
    res.status(201).json({ message: 'Blog created successfully', blog });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const blogs = await blogSchema.find({ websiteRole: req.user.role })
      .populate('author', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    const totalBlogs = await blogSchema.countDocuments({ websiteRole: req.user.role });
    res.status(200).json({ blogs, totalBlogs });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllBlogs = async (req, res) => {
  try {
    let { role } = req.query;

    // If role is not provided in query, determine from the route path
    if (!role) {
      const routePath = req.originalUrl || req.url;
      if (routePath.includes('/wholesaler/')) {
        role = 'wholesaler';
      } else if (routePath.includes('/retailer/')) {
        role = 'retailer';
      } else {
        return res.status(400).json({ message: 'Unable to determine role from request' });
      }
    }

    const blogs = await blogSchema.find({ websiteRole: role })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { title, content, existingImages } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];

    // Parse existing images if it's a string
    let parsedExistingImages = [];
    if (existingImages) {
      try {
        parsedExistingImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (error) {
        parsedExistingImages = [];
      }
    }

    const blog = await blogSchema.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { title, content, images: [...parsedExistingImages, ...images], updatedAt: Date.now() },
      { new: true }
    );
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const blog = await blogSchema.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ===== RETAILER CATEGORY FUNCTIONS =====

// Create Retailer Category
const createRetailerCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Validate category name
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Create the retailer category first
    const categoryData = {
      name,
      createdBy: req.user._id,
      subcategories: [], // Initialize with empty array
    };

    // Add image if provided
    if (req.file) {
      categoryData.image = req.file.path;
    }

    const category = await retailerCategoryModel.create(categoryData);

    // Parse and create subcategories if provided
    let subcategoryIds = [];
    if (subcategories) {
      let subcategoryNames;
      try {
        subcategoryNames = JSON.parse(subcategories);
        if (!Array.isArray(subcategoryNames)) {
          throw new Error('Subcategories must be an array');
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid subcategories format' });
      }

      // Validate subcategory names
      if (subcategoryNames.length > 0) {
        for (const subName of subcategoryNames) {
          if (typeof subName !== 'string' || subName.trim().length < 2) {
            return res.status(400).json({ message: 'Each subcategory name must be a string with at least 2 characters' });
          }
          const subcategory = await retailerSubcategoryModel.create({
            name: subName.trim(),
            category: category._id, // Set the category ID immediately
            createdBy: req.user._id,
          });
          subcategoryIds.push(subcategory._id);
        }

        // Update the category with subcategory IDs
        category.subcategories = subcategoryIds;
        await category.save();
      }
    }

    // Populate subcategories for response
    const populatedCategory = await retailerCategoryModel
      .findById(category._id)
      .populate('subcategories', 'name')
      .populate('createdBy', 'name');

    res.status(201).json(populatedCategory);
  } catch (error) {
    console.error('Error creating retailer category:', error);
    res.status(400).json({ message: error.message || 'Failed to create retailer category' });
  }
};

// Get Retailer Categories
const getRetailerCategories = async (req, res) => {
  try {
    const categories = await retailerCategoryModel
      .find()
      .populate('createdBy', 'name')
      .populate('subcategories', 'name');
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Retailer Category
const updateRetailerCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Validate category name
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Validate req.user
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Prepare update data
    const updateData = { name };
    if (req.file) {
      updateData.image = req.file.path;
    }

    // Parse and update subcategories if provided
    if (subcategories) {
      let subcategoryNames;
      try {
        subcategoryNames = JSON.parse(subcategories);
        if (!Array.isArray(subcategoryNames)) {
          return res.status(400).json({ message: 'Subcategories must be an array' });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid subcategories format' });
      }

      // Validate subcategory names
      for (const subName of subcategoryNames) {
        if (typeof subName !== 'string' || subName.trim().length < 2) {
          return res.status(400).json({ message: 'Each subcategory name must be a string with at least 2 characters' });
        }
      }

      // Get existing subcategories
      const existingSubcategories = await retailerSubcategoryModel.find({ category: req.params.id });

      // Delete subcategories that are no longer in the list
      const newSubcategoryNames = new Set(subcategoryNames.map(name => name.trim()));
      for (const existingSub of existingSubcategories) {
        if (!newSubcategoryNames.has(existingSub.name)) {
          await retailerSubcategoryModel.findByIdAndDelete(existingSub._id);
        }
      }

      // Add or update subcategories
      const subcategoryIds = [];
      for (const subName of newSubcategoryNames) {
        let subcategory = await retailerSubcategoryModel.findOne({
          name: subName,
          category: req.params.id
        });
        if (!subcategory) {
          try {
            subcategory = await retailerSubcategoryModel.create({
              name: subName,
              category: req.params.id,
              createdBy: req.user._id,
            });
          } catch (error) {
            return res.status(400).json({ message: `Failed to create subcategory '${subName}': ${error.message}` });
          }
        }
        if (subcategory && subcategory._id) {
          subcategoryIds.push(subcategory._id);
        } else {
          return res.status(500).json({ message: `Failed to process subcategory '${subName}'` });
        }
      }
      updateData.subcategories = subcategoryIds;
    }

    // Update the retailer category
    const category = await retailerCategoryModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('subcategories', 'name').populate('createdBy', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Retailer category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating retailer category:', error);
    res.status(400).json({ message: error.message || 'Failed to update retailer category' });
  }
};

// Delete Retailer Category
const deleteRetailerCategory = async (req, res) => {
  try {
    const category = await retailerCategoryModel.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Retailer category not found' });
    }

    // Delete associated subcategories
    await retailerSubcategoryModel.deleteMany({ category: req.params.id });

    await retailerCategoryModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Retailer category and its subcategories deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createRetailerCategory,
  getRetailerCategories,
  updateRetailerCategory,
  deleteRetailerCategory,
  getRetailerPurchases, deleteBrand, updateBrand, getBrands, createBrand, createBlog, getBlogs, getAllBlogs, updateBlog, deleteBlog
};
