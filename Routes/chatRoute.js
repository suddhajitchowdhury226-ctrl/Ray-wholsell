const express = require('express');
const router = express.Router();
const { Message, Conversation } = require('../Models/chatModel');
const User = require('../Models/user');
const { protect } = require('../Middleware/tokenVerify');

// Get all conversations for admin
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({})
      .populate('participants', 'name email role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a specific conversation (Public - allows guests)
router.get('/messages/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    let senderId = req.query.senderId;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        senderId = decoded.id?._id || decoded.id;
      } catch (err) {
        console.log('Token verification failed, parsing senderId:', err.message);
      }
    }

    if (!senderId) return res.json([]);

    let querySenderId = senderId;
    let isGuest = false;
    try {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        isGuest = true;
      }
    } catch (e) {
      isGuest = true;
    }

    if (isGuest) {
      const guestUser = await User.findOne({ email: `${senderId}@guest.local` });
      if (guestUser) {
        querySenderId = guestUser._id;
      } else {
        return res.json([]); // Guest hasn't sent messages yet
      }
    }

    const messages = await Message.find({
      $or: [
        { senderId: querySenderId, receiverId: adminId },
        { senderId: adminId, receiverId: querySenderId }
      ]
    }).populate('senderId', 'name role').sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message (requires authentication)
router.post('/send', async (req, res) => {
  try {
    let senderId = null;
    let actualReceiverId = req.body.receiverId;

    // Extract user ID from token - REQUIRED
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        senderId = decoded.id?._id || decoded.id;
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
      }
    }

    if (!senderId) {
      return res.status(401).json({ message: 'Authentication required. Please login to send messages.' });
    }

    console.log('Send message request:', { senderId, receiverId: actualReceiverId, message: req.body.message });

    // If receiverId is 'admin', find the first admin user
    if (actualReceiverId === 'admin') {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        actualReceiverId = adminUser._id;
      } else {
        return res.status(404).json({ message: 'No admin user found.' });
      }
    }

    const newMessage = new Message({
      senderId: senderId,
      receiverId: actualReceiverId,
      message: req.body.message
    });

    const savedMessage = await newMessage.save();
    await savedMessage.populate('senderId', 'name role');

    // Update or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, actualReceiverId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, actualReceiverId],
        lastMessage: savedMessage._id
      });
    } else {
      conversation.lastMessage = savedMessage._id;
      conversation.updatedAt = new Date();
    }

    await conversation.save();

    console.log('Message saved:', savedMessage);
    res.json(savedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: error.message });
  }
});



// Get unread message count for admin
router.get('/unread-count/:adminId', protect, async (req, res) => {
  try {
    const { adminId } = req.params;
    const count = await Message.countDocuments({
      receiverId: adminId,
      isRead: false
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread message counts per user for admin
router.get('/unread-counts-per-user/:adminId', protect, async (req, res) => {
  try {
    const { adminId } = req.params;
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: new (require('mongoose').Types.ObjectId)(adminId),
          isRead: false
        }
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    unreadCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    res.json(countMap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages from a specific user as read
router.put('/mark-read/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    await Message.updateMany(
      { senderId: userId, receiverId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users who have chatted with admin, sorted by latest activity
router.get('/users', async (req, res) => {
  try {
    let adminId = null;

    // Get admin ID from token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        adminId = decoded.id?._id || decoded.id;
      } catch (err) { }
    }

    // If no admin ID, find admin from DB
    if (!adminId) {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) adminId = admin._id;
    }

    const mongoose = require('mongoose');
    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    // Find conversations that involve the admin, sorted by latest activity
    const conversations = await Conversation.find({
      participants: adminObjectId
    }).sort({ updatedAt: -1 });

    // Extract the other participant IDs (not admin) in order
    const orderedUserIds = [];
    for (const conv of conversations) {
      for (const participantId of conv.participants) {
        if (String(participantId) !== String(adminId)) {
          const idStr = String(participantId);
          if (!orderedUserIds.includes(idStr)) {
            orderedUserIds.push(idStr);
          }
        }
      }
    }

    // Fetch user details for these IDs
    const users = await User.find({
      _id: { $in: orderedUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select('name email role');

    // Re-sort users to match the conversation order
    const userMap = {};
    users.forEach(u => { userMap[String(u._id)] = u; });

    const sortedUsers = orderedUserIds
      .map(id => userMap[id])
      .filter(Boolean); // remove any nulls

    res.json(sortedUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;