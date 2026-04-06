const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Conversation = require('../models/Conversation');

// Simple data viewer
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ timestamp: -1 }).limit(20);
    const conversations = await Conversation.find().sort({ updatedAt: -1 }).limit(10);
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 30px; }
            pre { background: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #ddd; }
            .stats { background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <h1>📊 Database Viewer</h1>
        <div class="stats">
            <strong>Statistics:</strong><br>
            Total Chats: ${await Chat.countDocuments()}<br>
            Total Conversations: ${await Conversation.countDocuments()}
        </div>
        
        <h2>📝 Recent Chats (${chats.length})</h2>
        <pre>${JSON.stringify(chats, null, 2)}</pre>
        
        <h2>💬 Recent Conversations (${conversations.length})</h2>
        <pre>${JSON.stringify(conversations, null, 2)}</pre>
    </body>
    </html>`;
    
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;