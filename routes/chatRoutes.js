const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { getAIResponse } = require('../controllers/aiController');

// Debug log
console.log('✅ Chat routes loaded');
console.log('📌 getAIResponse type:', typeof getAIResponse);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Chat API is working!',
    timestamp: new Date().toISOString()
  });
});

// Message endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, userId, conversationId } = req.body;
    
    console.log('📨 Received message:', { message, userId, conversationId });
    
    if (!message || !userId) {
      return res.status(400).json({ 
        error: 'Message and userId are required' 
      });
    }
    
    // Call the AI function
    const result = await getAIResponse(message, userId, conversationId);
    
    res.json({
      success: true,
      response: result.response,
      conversationId: result.conversationId
    });
  } catch (error) {
    console.error('❌ Error in message endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// History endpoint
router.get('/history/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(chats);
  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check users
router.get('/debug/users/:userId', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ userId: req.params.userId });
    res.json({ 
      count: users.length,
      users: users 
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Debug endpoint to check users in database
router.get('/debug/users/:userId', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ userId: req.params.userId });
    res.json({
      success: true,
      count: users.length,
      users: users,
      message: `Found ${users.length} users in database`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Migrate all users from old userId to new userId
router.post('/migrate-users/:oldUserId/:newUserId', async (req, res) => {
  try {
    const User = require('../models/User');
    const result = await User.updateMany(
      { userId: req.params.oldUserId },
      { userId: req.params.newUserId }
    );
    
    res.json({
      success: true,
      message: `Migrated ${result.modifiedCount} users from ${req.params.oldUserId} to ${req.params.newUserId}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Show all users and their userIds
router.get('/debug/all-users', async (req, res) => {
  try {
    const User = require('../models/User');
    const allUsers = await User.find({});
    res.json({
      total: allUsers.length,
      users: allUsers.map(u => ({
        name: u.name,
        age: u.age,
        userId: u.userId,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;