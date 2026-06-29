// const multer = require('multer');
// const path = require('path');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/productImages/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const filetypes = /jpeg|jpg|png/;
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//   const mimetype = filetypes.test(file.mimetype);

//   if (extname && mimetype) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only JPEG, JPG, and PNG files are allowed!'), false);
//   }
// };

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
//   fileFilter,
// });

// module.exports = upload;


const multer = require('multer');
const path = require('path');

const getStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `uploads/${folder}/`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
const filetypes = /jpeg|jpg|png|webp|gif|bmp|tiff|svg/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, and PNG files are allowed!'), false);
  }
};

// CSV file filter
const csvFileFilter = (req, file, cb) => {
  const filetypes = /csv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel';

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed!'), false);
  }
};

const createUpload = (folder) => multer({
  storage: getStorage(folder),
  limits: { fileSize: 50 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

const createCSVUpload = (folder) => multer({
  storage: getStorage(folder),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for CSV
  fileFilter: csvFileFilter,
});

module.exports = {
  uploadCategory: createUpload('categoryImages'),
  uploadProduct: createUpload('productImages'),
   uploadProfile: createUpload('profileImages'), // ✅ NEW
   uploadBlog: createUpload('blogImages'), // ✅ NEW
   uploadCSV: createCSVUpload('csvFiles'), // ✅ NEW for CSV uploads
};