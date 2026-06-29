const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a blog title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content'],
    trim: true
  },
  images: [{
    type: String,
    default: ''
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify the author'],
  },
  websiteRole: {
    type: String,
    enum: ['retailer', 'wholesaler'],
    required: [true, 'Please specify the website role'],
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);