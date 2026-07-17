// Re-export from cloudinary config so all routes keep working without changes
const cloudinaryUploads = require('../config/cloudinary');
module.exports = cloudinaryUploads;
