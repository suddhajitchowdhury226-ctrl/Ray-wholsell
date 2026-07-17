const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createCloudinaryUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `ray-wholsell/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
};

const createCSVUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/csvFiles/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed!'), false);
      }
    },
  });
};

module.exports = {
  uploadCategory: createCloudinaryUpload('categoryImages'),
  uploadProduct: createCloudinaryUpload('productImages'),
  uploadProfile: createCloudinaryUpload('profileImages'),
  uploadBlog: createCloudinaryUpload('blogImages'),
  uploadCSV: createCSVUpload(),
  cloudinary,
};
