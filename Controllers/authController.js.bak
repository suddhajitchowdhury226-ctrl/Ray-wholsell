const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const User = require('../Models/user');
const shipmentModel = require('../Models/shipmentModel')
const nodemailer = require('nodemailer');
const feedbackModel = require('../Models/feedbackModel');
const counsellingModel = require('../Models/counsellingModel');
const mongoose = require('mongoose');
const CouponModel = require('../Models/CouponModel');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE user profile
exports.updateUser = async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    const updateData = { name, email, phone };

    // ✅ If an image is uploaded, add it to the update data
    if (req.file) {
      updateData.profileImage = `/uploads/profileImages/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





exports.registerUser = async (req, res) => {
  const { name, email, phone, role, password } = req.body;

  try {
    if (!['wholesaler', 'retailer', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only wholesaler, retailer, or user allowed.' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'Email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate Verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    const user = await User.create({
      name,
      email,
      phone,
      role,
      password: hashedPassword,
      isVerified: false,
      verificationOTP: otp,
      verificationOTPExpires: otpExpires
    });

    // Send Verification Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: '"Ray Healthy Living" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #77a13d; text-align: center;">Welcome to Ray Healthy Living!</h2>
          <p>Hi ${name},</p>
          <p>Thank you for registering. Please verify your email address to complete your signup.</p>
          <p>Your Verification OTP is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      logger.error('Email sending failed', { message: emailError.message });
      // We still return success as user is created, but they might need to resend OTP
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      userId: user._id,
      email: user.email,
      requiresVerification: true
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Email OTP
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (user.verificationOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.verificationOTPExpires) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify User
    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    await user.save();

    // Return Login Token
    const token = generateToken({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      message: "Email verified successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });

  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Resend Verification OTP
exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    // Generate New OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP = otp;
    user.verificationOTPExpires = otpExpires;
    await user.save();

    // Send Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: '"Ray Healthy Living" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Resend Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ed8936; text-align: center;">New Verification OTP</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a new OTP.</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
            ${otp}
          </div>
          <p>Valid for 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.loginUser = async (req, res) => {
//   const { email, password, role } = req.body;

//   try {
//     if (!['admin', 'wholesaler', 'retailer', 'user'].includes(role)) {
//       return res.status(400).json({ message: 'Invalid role. Must be admin, wholesaler, retailer, or user.' });
//     }

//     const user = await User.findOne({ email, role }).select('+password');
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid email or role' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const token = generateToken(user._id); // Pass user._id
//     res.status(200).json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       token,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




exports.loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Validate role
    if (!['admin', 'wholesaler', 'retailer', 'user'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be admin, wholesaler, retailer, or user.',
      });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or role' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create token excluding password
    const token = generateToken({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Respond without password
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });

  } catch (error) {
    console.error('[LOGIN ERROR]:', error);
    res.status(500).json({ message: error.message });
  }
};


// Admin Signup — requires ADMIN_REGISTRATION_KEY in request body
exports.registerAdmin = async (req, res) => {
  const { name, email, phone, password, adminKey } = req.body;

  // Validate the admin registration secret key
  if (!adminKey || adminKey !== process.env.ADMIN_REGISTRATION_KEY) {
    return res.status(403).json({ message: 'Forbidden: invalid admin registration key' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'Email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone,
      role: 'admin',
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Not an admin." });
    }

    res.status(200).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Not an admin." });
    }

    const { name, email, phone } = req.body;

    // Check if email or phone already exists for another user
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
      _id: { $ne: adminId },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email or phone already in use." });
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;

    await admin.save();

    res.status(200).json({
      message: "Admin profile updated successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


exports.getWholesalerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user || user.role !== "wholesaler") {
      return res.status(403).json({ message: "Access denied. Not a wholesaler." });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateWholesalerProfile = async (req, res) => {
  try {
    console.log('req.body:', req.body); // Debug
    console.log('req.file:', req.file); // Debug

    // Default to empty object if req.body is undefined
    const { name, phone, email, password } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user || user.role !== "wholesaler") {
      return res.status(403).json({ message: "Access denied. Not a wholesaler." });
    }

    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use by another user." });
      }
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (phoneExists) {
        return res.status(400).json({ message: "Phone number already in use by another user." });
      }
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.email = email || user.email;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      user.profileImage = `/uploads/profileImages/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error('Error in updateWholesalerProfile:', error);
    res.status(500).json({ message: error.message });
  }
};

// exports.getRetailerProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select("-password");

//     if (!user || user.role !== "retailer") {
//       return res.status(403).json({ message: "Access denied. Not a retailer." });
//     }

//     res.status(200).json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


exports.getRetailerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user || user.role !== "retailer") {
      return res.status(403).json({ message: "Access denied. Not a retailer." });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRetailerProfile = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== "retailer") {
      return res.status(403).json({ message: "Access denied. Not a retailer." });
    }

    const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use by another user." });
    }

    const phoneExists = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (phoneExists) {
      return res.status(400).json({ message: "Phone number already in use by another user." });
    }

    // Update fields
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.email = email || user.email;

    // Handle password update
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Handle profile image upload
    if (req.file) {
      user.profileImage = `/uploads/profileImages/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      message: "Retailer profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.updateRetailerProfile = async (req, res) => {
//   try {
//     const { name, phone, email } = req.body;

//     const user = await User.findById(req.user._id);
//     if (!user || user.role !== "retailer") {
//       return res.status(403).json({ message: "Access denied. Not a retailer." });
//     }

//     const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
//     if (emailExists) {
//       return res.status(400).json({ message: "Email already in use by another user." });
//     }

//     const phoneExists = await User.findOne({ phone, _id: { $ne: req.user._id } });
//     if (phoneExists) {
//       return res.status(400).json({ message: "Phone number already in use by another user." });
//     }

//     user.name = name || user.name;
//     user.phone = phone || user.phone;
//     user.email = email || user.email;

//     await user.save();

//     res.status(200).json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       message: "Retailer profile updated successfully"
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.addAddress = async (req, res) => {
//   try {
//     const { title, name, contactNumber, email, addressLine1, addressLine2, state, country, zipcode } = req.body;

//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const newAddress = {
//       title,
//       name,
//       contactNumber,
//       email,
//       addressLine1,
//       addressLine2,
//       state,
//       country,
//       zipcode,
//       isDefault: user.addresses.length === 0 // first address becomes default
//     };

//     user.addresses.push(newAddress);
//     await user.save();

//     res.status(201).json({ message: "Address added", addresses: user.addresses });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update address
// exports.updateAddress = async (req, res) => {
//   try {
//     const { addressId } = req.params;
//     const updateFields = req.body;

//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const address = user.addresses.id(addressId);
//     if (!address) return res.status(404).json({ message: "Address not found" });

//     Object.assign(address, updateFields);
//     await user.save();

//     res.status(200).json({ message: "Address updated", addresses: user.addresses });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get all addresses
// exports.getAddresses = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("addresses");
//     if (!user) return res.status(404).json({ message: "User not found" });

//     res.status(200).json({ addresses: user.addresses });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Delete address
// exports.deleteAddress = async (req, res) => {
//   try {
//     const { addressId } = req.params;

//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
//     await user.save();

//     res.status(200).json({ message: "Address deleted", addresses: user.addresses });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Add to Wishlist



// Add address
exports.addAddress = async (req, res) => {
  try {
    const { title, name, contactNumber, email, addressLine1, addressLine2, city, state, country, zipcode } = req.body;

    // Validate required fields
    if (!title || !name || !contactNumber || !email || !addressLine1 || !city || !state || !country || !zipcode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newAddress = {
      title,
      name,
      contactNumber,
      email,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      country,
      zipcode,
      isDefault: user.addresses.length === 0 // First address becomes default
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({ message: 'Address added', addresses: user.addresses });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { title, name, contactNumber, email, addressLine1, addressLine2, city, state, country, zipcode, isDefault } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    // Update provided fields
    if (title) address.title = title;
    if (name) address.name = name;
    if (contactNumber) address.contactNumber = contactNumber;
    if (email) address.email = email;
    if (addressLine1) address.addressLine1 = addressLine1;
    address.addressLine2 = addressLine2 || '';
    if (city) address.city = city;
    if (state) address.state = state;
    if (country) address.country = country;
    if (zipcode) address.zipcode = zipcode;
    if (typeof isDefault === 'boolean') address.isDefault = isDefault;

    await user.save();

    res.status(200).json({ message: 'Address updated', addresses: user.addresses });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all addresses
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('addresses');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ addresses: user.addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();

    res.status(200).json({ message: 'Address deleted', addresses: user.addresses });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.wishlist = user.wishlist.filter(
      pid => pid.toString() !== productId
    );
    await user.save();

    res.status(200).json({ message: "Product removed from wishlist", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Wishlist
// Get Wishlist
exports.getWishlist = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(200).json({ wishlist: [] });
    }

    const user = await User.findById(req.user.id).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all wholesalers and retailers
exports.getWholesalersAndRetailers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['wholesaler', 'retailer'] } }).select('-password');

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No wholesalers or retailers found' });
    }

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateUserCommission = async (req, res) => {
  const { userId, commission } = req.body;

  try {
    // Validate input
    if (!userId || commission === undefined) {
      return res.status(400).json({ message: 'User ID and commission value are required' });
    }

    // Validate commission is a number and within a reasonable range (e.g., 0-100%)
    if (isNaN(commission) || commission < 0 || commission > 100) {
      return res.status(400).json({ message: 'Commission must be a number between 0 and 100' });
    }

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { commission },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Commission updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user commission
exports.getUserCommission = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select('name commission');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      name: user.name,
      commission: user.commission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllShipments = async (req, res) => {
  try {
    const shipments = await shipmentModel.find()
      .populate('user', 'name email') // Optional: show user info
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: shipments.length,
      shipments,
    });
  } catch (error) {
    console.error('Error fetching all shipments:', error.message);
    res.status(500).json({
      message: 'Failed to fetch shipments',
      error: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['user', 'retailer', 'wholesaler'] } }).select('-password');

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.sendEmail = async (req, res) => {
  const { to, name, password } = req.body;

  if (!to || !name || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "tirtho.kyptronix@gmail.com",
        pass: "kozi ozmn wtzn cuyg",
      },
    });

    const mailOptions = {
      from: '"Wholesale Admin" <tirtho.kyptronix@gmail.com>',
      to,
      subject: "Your Account Credentials",
      text: `Hi ${name},\n\nYour account has been created.\n\nLogin Email: ${to}\nPassword: ${password}\n\nPlease change your password after logging in.\n\n- Wholesale Team`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    logger.error('Email send error', { message: error.message });
    res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
  }
};



// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



exports.submitFeedback = async (req, res) => {
  try {
    await transporter.verify();
    console.log('Transporter verified successfully');
  } catch (error) {
    console.error('Transporter verification failed:', error.message);
  }

  try {
    const { name, phone, email, subject, message } = req.body;

    console.log('req.body', req.body);

    // Validate input
    if (!name || !phone || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create new feedback
    const feedback = new feedbackModel({
      name,
      phone,
      email,
      subject,
      message,
    });

    // Save to database
    await feedback.save();

    // Send email notification
    const mailOptions = {
      from: '"Feedback System" <satpalemailcheck12@gmail.com>',
      to: email,
      subject: 'Thank You for Your Feedback',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Feedback Received</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background-color: #ff6200; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <img src="https://via.placeholder.com/150x50?text=Your+Logo" alt="Logo" style="max-width: 150px; height: auto;">
                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0;">Thank You for Your Feedback!</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding: 30px;">
                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">We’ve Received Your Feedback</h2>
                <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                  Dear ${name},<br><br>
                  Thank you for taking the time to share your feedback with us. We value your input and will use it to improve our services.
                </p>
                <table role="presentation" width="100%" style="margin: 20px 0; border-top: 2px solid #ff6200;">
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Name:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Phone:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Email:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Subject:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Message:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${message}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #333333; font-size: 16px; font-weight: bold; width: 30%;">Submitted At:</td>
                    <td style="padding: 10px 0; color: #555555; font-size: 16px;">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
                <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                  We’ll review your message and get back to you if needed. Feel free to reach out with any further questions or suggestions!
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f4f4f4; padding: 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                <p style="color: #777777; font-size: 14px; margin: 0;">
                  &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.<br>
                  <a href="https://yourwebsite.com" style="color: #ff6200; text-decoration: none;">Visit our website</a> | 
                  <a href="mailto:support@yourwebsite.com" style="color: #ff6200; text-decoration: none;">Contact Support</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully');
    } catch (emailError) {
      logger.error('Email sending failed', { message: emailError.message });
      return res.status(201).json({
        message: 'Feedback submitted successfully, but email sending failed',
        feedback,
        emailError: emailError.message,
      });
    }

    res.status(201).json({
      message: 'Feedback submitted successfully and email sent',
      feedback,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error.message);
    res.status(500).json({
      error: 'Error submitting feedback',
      details: error.message,
    });
  }
};



exports.createCounseling = async (req, res) => {
  try {
    const { name, email, phone, location, helpWith, contactMethod, bestTime, whereDoYouLive, state } = req.body;

    // Basic validation
    if (!name || !email || !location || !helpWith || !contactMethod || !bestTime || !whereDoYouLive) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Create new counseling record
    const counseling = new counsellingModel({
      name,
      email,
      phone,
      location,
      helpWith,
      contactMethod,
      bestTime,
      whereDoYouLive,
      state,
    });

    // Save to database
    await counseling.save();

    res.status(201).json({ message: 'Counseling form submitted successfully' });
  } catch (error) {
    console.error('Error saving counseling form:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCounselings = async (req, res) => {
  try {
    const counselings = await counsellingModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, counselings });
  } catch (error) {
    console.error('Error fetching counseling requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCounseling = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await counsellingModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Counseling request not found' });
    }
    res.status(200).json({ success: true, message: 'Counseling request deleted successfully' });
  } catch (error) {
    console.error('Error deleting counseling request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// Create a coupon
exports.createCoupon = async (req, res) => {
  try {

    const { code, discountType, discountValue, minPurchase, maxDiscount, expiryDate, usageLimit, applicableProducts } = req.body;

    logger.info('Role check passed');
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create coupons' });
    }

    const coupon = await CouponModel.create({
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      expiryDate,
      usageLimit,
      createdBy: req.user._id,
      applicableProducts: applicableProducts || [],
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: error.message || 'Failed to create coupon' });
  }
};

// Get all coupons
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await CouponModel.find()
      .populate('createdBy', 'name email')
      .populate('applicableProducts', 'name');
    res.status(200).json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
};

// Get single coupon
exports.getCoupon = async (req, res) => {
  try {
    const coupon = await CouponModel.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('applicableProducts', 'name');
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ message: 'Failed to fetch coupon' });
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update coupons' });
    }

    const coupon = await CouponModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, createdBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete coupons' });
    }

    const coupon = await CouponModel.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

// Validate and apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartItems, addressId } = req.body;


    const coupon = await CouponModel.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon' });
    }

    if (coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    const products = await mongoose.model('Product').find({
      _id: { $in: cartItems.map(item => item.product._id) }
    });

    let totalCartPrice = 0;
    let eligibleTotal = 0;

    cartItems.forEach(item => {
      const product = products.find(p => p._id.toString() === item.product._id.toString());
      if (product) {
        const itemTotal = product.buyPrice * item.quantity;
        totalCartPrice += itemTotal;

        // If applicableProducts array is empty, it applies to all products
        // Standard in this project is that empty array = all, or ALL IDs are populated
        const isApplicable = !coupon.applicableProducts ||
          coupon.applicableProducts.length === 0 ||
          coupon.applicableProducts.some(id => id.toString() === product._id.toString());

        if (isApplicable) {
          eligibleTotal += itemTotal;
        }
      }
    });

    if (eligibleTotal === 0) {
      return res.status(400).json({ message: 'No applicable products for this coupon in your cart' });
    }

    if (totalCartPrice < coupon.minPurchase) {
      return res.status(400).json({ message: `Minimum total cart purchase of $${coupon.minPurchase} required` });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (eligibleTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // Fixed discount cannot exceed the eligible total itself
      discount = Math.min(coupon.discountValue, eligibleTotal);
    }

    res.status(200).json({
      message: 'Coupon applied successfully',
      discount,
      couponId: coupon._id,
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ message: 'Failed to apply coupon' });
  }
};

// ==================== PASSWORD RESET FUNCTIONS ====================

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send password reset OTP
exports.sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save OTP to user
    user.resetOTP = otp;
    user.resetOTPExpires = otpExpires;
    await user.save();

    // Send email
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - Ray Healthy Living',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #77a13d; text-align: center;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You have requested to reset your password. Use the OTP below to verify your identity:</p>
          <div style="background: linear-gradient(135deg, #77a13d, #e97717); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h1 style="color: white; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #e74c3c;">If you did not request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Ray Healthy Living. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP sent to your email successfully',
      email: email
    });

  } catch (error) {
    logger.error('Error sending password reset OTP', { message: error.message });
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// Verify password reset OTP
exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Check if OTP exists and is not expired
    if (!user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
    }

    if (new Date() > user.resetOTPExpires) {
      // Clear expired OTP
      user.resetOTP = null;
      user.resetOTPExpires = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (user.resetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    res.status(200).json({
      message: 'OTP verified successfully',
      verified: true
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Verify OTP again for security
    if (!user.resetOTP || user.resetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    if (new Date() > user.resetOTPExpires) {
      user.resetOTP = null;
      user.resetOTPExpires = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    res.status(200).json({
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    logger.error('Error resetting password', { message: error.message });
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
};