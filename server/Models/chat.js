const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, default: null },  
  fileUrl: { type: String, default: null }, 
  productUrl: { type: String, default: null },
  seen: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  sent: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }],
  messages: [messageSchema],
  deletedBy: [{ type: String }], 
  deletionTimestamps: [
    {
      userId: { type: String },
      timestamp: { type: Date }
    }
  ], 
  updatedAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema, 'chats');

module.exports = Chat;
