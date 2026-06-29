const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  submitWholesalerForm, 
  getWholesalerForm, 
  getAllWholesalerForms, 
  updateFormStatus 
} = require('../Controllers/wholesalerFormController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resaleCertificates/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'certificate-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Submit wholesaler form
router.post('/submit', upload.single('resaleCertificateFile'), submitWholesalerForm);

// Get wholesaler form by user ID
router.get('/user/:userId', getWholesalerForm);

// Get all wholesaler forms (admin)
router.get('/all', getAllWholesalerForms);

// Update form status (admin)
router.put('/status/:formId', updateFormStatus);

module.exports = router;