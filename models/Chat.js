const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('Chat', chatSchema);