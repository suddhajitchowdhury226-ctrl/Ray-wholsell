const express = require("express");
const app = express();
app.set('trust proxy', 1); // ✅ Fix: Required on Render (behind reverse proxy) - fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
const http = require('http');
const socketIo = require('socket.io');
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const connectDb = require("./config/db");
const { default: axios } = require("axios");
const paypal = require('paypal-rest-sdk');
const logger = require('./utils/logger');

// ✅ Ensure upload directories exist
const uploadDirs = ['uploads/blogImages', 'uploads/categoryImages', 'uploads/productImages', 'uploads/profileImages', 'uploads/csvFiles'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logger.info(`Created upload directory: ${dir}`);
  }
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://user-wholesaler.netlify.app",
      "https://ray-wholsell.vercel.app", // ✅ Fix: removed trailing slash
      "https://admin-wholesaler.netlify.app",
      "https://ray-admin-eight.vercel.app",  // Vercel admin panel
      "http://localhost:5173",
      "http://localhost:5176",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://retailer-wholesaler-website.netlify.app",
      "http://rayonesystem.com",
      "https://rayshealthyliving.com",
      "https://workspace.rayonewholesale.com",
      "https://rayonewholesale.com",
      "https://wholseal.vercel.app",
      "https://ray-retailll.vercel.app",
      "https://ray-retaill.vercel.app"
    ],
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// ✅ Stripe webhook must be registered BEFORE express.json()
const webhookRouter = require("./Routes/webhookRoute");
app.use("/webhook", webhookRouter);

// PayPal configuration
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'live',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// ✅ CORS Configuration (before all other routes)
const allowedOrigins = [
  "https://admin-wholesaler.netlify.app",
  "https://user-wholesaler.netlify.app", 
  "https://ray-wholsell.vercel.app",
  "https://ray-admin-eight.vercel.app",  // Vercel admin panel
  "https://rayonewholesale.com",
  "https://www.rayonewholesale.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5180",  // Admin panel
  "https://retailer-wholesaler-website.netlify.app",
  "http://rayonesystem.com",
  "https://rayshealthyliving.com",
  "https://workspace.rayonewholesale.com",
  "https://wholseal.vercel.app",
  "https://ray-retailll.vercel.app",
  "https://ray-retaill.vercel.app",
  "https://ray-retail.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ✅ Compression middleware
const compression = require('compression');
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ✅ Security headers via Helmet (before all routes)
app.use(helmet({
  // Allow images/static files to be loaded cross-origin (browser on
  // rayonewholesale.com fetching product images from the Render server).
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Keep all other security headers at their secure defaults
  contentSecurityPolicy: false,  // managed per-route if needed
}));

// ✅ Rate limiting
// General: 100 requests per 15 minutes per IP across all /api/ routes
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
}));

// Login: stricter — 20 attempts per 15 minutes per IP
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
}));

// Forgot password: 10 attempts per 15 minutes per IP
app.use('/api/auth/forgot-password', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests, please try again later.' },
}));

// ✅ JSON parser after webhook
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ MongoDB injection protection
app.use((req, res, next) => {
  ['body', 'params'].forEach((key) => {
    if (req[key]) {
      req[key] = mongoSanitize.sanitize(req[key], { allowDots: false, replaceWith: '_' });
    }
  });
  next();
});

// ✅ Cache middleware
const { cacheMiddleware } = require('./Middleware/cacheMiddleware');

// ✅ Serve uploaded files with caching
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Allow browsers on any origin to load product images
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ||
        filePath.endsWith('.png') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// ✅ API Routes
app.use("/api/auth", require("./Routes/authRoute"));
app.use("/api/admin", require("./Routes/adminRoute"));
app.use("/api/wholesaler", require("./Routes/wholesalerRoute"));
app.use("/api/retailer", require("./Routes/retailorRoute"));
app.use("/api/user", require("./Routes/userRoute"));
app.use("/api/reviews", require("./Routes/reviewRoute"));
app.use('/api/bookings', require("./Routes/bookingRoutes"));
app.use('/api/payments', require('./Routes/paymentRoute'));
app.use("/api/bulk", require("./Routes/bulkRoute"));
app.use("/api/wholesaler-form", require("./Routes/wholesalerFormRoute"));
app.use("/api/chat", require("./Routes/chatRoute"));
app.use("/api/supplier-orders", require("./Routes/supplierOrderRoute"));

// ✅ Shipment Tracking Endpoint
const trackShipment = async (carrierCode, trackingNumber) => {
  const url = `https://api.shipengine.com/v1/tracking?carrier_code=${carrierCode}&tracking_number=${trackingNumber}`;
  try {
    const response = await axios.get(url, {
      headers: {
        "API-Key": process.env.SHIPENGINE_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error tracking shipment:", error.message);
    throw error;
  }
};

app.get("/track", async (req, res) => {
  const { carrierCode, trackingNumber } = req.query;
  if (!carrierCode || !trackingNumber) {
    return res.status(400).json({ error: "Carrier code and tracking number are required." });
  }
  try {
    const trackingData = await trackShipment(carrierCode, trackingNumber);
    res.json(trackingData);
  } catch (error) {
    logger.error('Shipment tracking failed', { message: error.message });
    res.status(500).json({ error: "Failed to track shipment." });
  }
});

// ✅ Delete all wholesaler products API
app.delete('/api/delete-wholesaler-products', async (req, res) => {
  try {
    const User = require('./Models/user');
    const Product = require('./Models/productModel');
    const wholesalers = await User.find({ role: 'wholesaler' }).select('_id');
    const wholesalerIds = wholesalers.map(w => w._id);
    const result = await Product.deleteMany({ createdBy: { $in: wholesalerIds } });
    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} wholesaler products`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error deleting wholesaler products', { message: error.message });
    res.status(500).json({ message: 'Failed to delete wholesaler products', error: error.message });
  }
});

// ✅ Connect DB and Start Server
connectDb();

// Create database indexes for performance
const createIndexes = require('./config/dbIndexes');
setTimeout(() => createIndexes(), 5000);

let adminSocketId = null;

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Socket: client connected');

  socket.on('join-room', (userId) => {
    socket.join(userId);
  });

  socket.on('check-admin-status', () => {
    socket.emit('admin-online-status', { isOnline: !!adminSocketId });
  });

  socket.on('send-message', async (data) => {
    const getSenderId = data.senderId?._id || (typeof data.senderId === 'string' ? data.senderId : null);
    const getReceiverId = data.receiverId?._id || (typeof data.receiverId === 'string' ? data.receiverId : null);

    const User = require('./Models/user');
    const adminUser = await User.findOne({ role: 'admin' });
    const isReceiverAdmin = getReceiverId === 'admin' || (adminUser && String(getReceiverId) === String(adminUser._id));
    const actualReceiverId = isReceiverAdmin && adminUser ? String(adminUser._id) : String(getReceiverId);

    io.to(actualReceiverId).emit('receive-message', data);
    io.to('admin').emit('receive-message', data);

    if (isReceiverAdmin) {
      try {
        const { Message, Conversation } = require('./Models/chatModel');
        if (adminUser) {
          setTimeout(async () => {
            const replyText = "Thank you for reaching out! We'll get back to you shortly. 😊";
            const senderIdForReply = typeof data.senderId === 'object' ? data.senderId._id : data.senderId;
            const autoReplyMsg = new Message({
              senderId: adminUser._id,
              receiverId: senderIdForReply,
              message: replyText
            });
            await autoReplyMsg.save();
            await autoReplyMsg.populate('senderId', 'name role');

            let conversation = await Conversation.findOne({
              participants: { $all: [data.senderId, adminUser._id] }
            });
            if (conversation) {
              conversation.lastMessage = autoReplyMsg._id;
              conversation.updatedAt = new Date();
              await conversation.save();
            }

            const replyData = {
              senderId: { _id: adminUser._id, role: 'admin' },
              receiverId: senderIdForReply,
              message: replyText,
              timestamp: autoReplyMsg.timestamp,
              _id: autoReplyMsg._id
            };
            io.to(senderIdForReply.toString()).emit('receive-message', replyData);
          }, 1000);
        }
      } catch (err) {
        logger.error('Socket: auto-reply error', { message: err.message });
      }
    }
  });

  socket.on('admin-join', () => {
    socket.join('admin');
    adminSocketId = socket.id;
    io.emit('admin-online-status', { isOnline: true });
    logger.info('Socket: admin joined');
  });

  socket.on('disconnect', () => {
    if (socket.id === adminSocketId) {
      adminSocketId = null;
      io.emit('admin-online-status', { isOnline: false });
      logger.info('Socket: admin disconnected');
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT}`);
});
