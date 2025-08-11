const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const { ExpressPeerServer } = require("peer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Models
const User = require("./Models/user");
const UserList = require("./Models/chatList");
const Chat = require("./Models/chat");

// Routers
const DeleteChat = require("./routers/chat/deleteChat.js");
const DeleteMsg = require("./routers/chat/deleteMessage.js");
const BlockUser = require("./routers/chat/blockUser.js");
const ChatLists = require("./routers/chat/chatlist.js");
const MarkMsgSeen = require("./routers/chat/messageStatus.js");
const register = require("./routers/auth/register.js");
const login = require("./routers/auth/login.js");
const generateOTP = require("./routers/auth/generateOTP.js");
const generateResetPassOTP = require("./routers/auth/generateResetPassOTP.js");
const updatePassword = require("./routers/auth/updatePassword.js");
const updateUsers = require("./routers/auth/updateUser.js");
const addChat = require("./routers/chat/addNewChat.js");
const callLogs = require("./routers/callLogs/storeCallLogs.js");
const updateCallLogs = require("./routers/callLogs/updateCallLogs.js");
const fetchCallLogs = require("./routers/callLogs/fetchCallLogs.js");
const deleteCallLogs = require("./routers/callLogs/deleteCallLogs.js");

dotenv.config();
const app = express();

// CORS - Fixed to include PATCH method
app.use(cors({
  origin: [
   "https://whatsapp-clone-iota-two.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Only apply COOP headers where necessary (e.g., for WebRTC)
app.use((req, res, next) => {
  if (req.path.startsWith("/peerjs")) {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Static files
app.use("/chat", express.static(path.join(__dirname, "Users-files/users-chat-files")));
app.use("/profiles", express.static(path.join(__dirname, "Users-files/profiles")));

// Routes
app.use("/users/auth", register);
app.use("/users/auth", login);
app.use("/users/auth", generateOTP);
app.use("/users/auth", generateResetPassOTP);
app.use("/users/auth", updatePassword);
app.use("/users/auth", updateUsers);
app.use("/users/chats", DeleteChat);
app.use("/users/chats", DeleteMsg);
app.use("/users/auth", BlockUser);
app.use("/users/chatlists", ChatLists);
app.use("/users/chats", MarkMsgSeen);
app.use("/GChat/chatlists", addChat);
app.use("/call/callhistories", callLogs);
app.use("/call/update-call-logs", updateCallLogs);
app.use("/call/fetch-call-logs", fetchCallLogs);
app.use("/call/delete-call-logs", deleteCallLogs);

// HTTP & WebSocket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
     "https://whatsapp-clone-iota-two.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Prioritize websocket
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true
});

// PeerJS
const peerServer = ExpressPeerServer(server, { debug: true });
app.use("/peerjs", peerServer);

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected..."))
  .catch(err => console.error("MongoDB connection error:", err));

// File upload
const BASE_URL = process.env.BASE_URL || "https://whatsapp-clone-i6bl.onrender.com/chat";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.body.senderId;
    const userDir = path.join(__dirname, "Users-files/users-chat-files", userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

app.post("/upload-file", upload.single("file"), (req, res) => {
  const { senderId } = req.body;
  const fileUrl = req.file ? `${BASE_URL}/${senderId}/${req.file.filename}` : null;
  if (fileUrl) {
    res.status(200).json({ message: "File uploaded successfully", fileUrl });
  } else {
    res.status(400).json({ message: "File upload failed" });
  }
});

// Fetch chat
app.get("/users/chats/:userId/:peerId", async (req, res) => {
  const { userId, peerId } = req.params;
  try {
    let chat = await Chat.findOne({ participants: { $all: [userId, peerId] } });
    if (chat && chat.deletedBy?.includes(userId)) {
      chat.deletedBy = chat.deletedBy.filter(id => id !== userId);
      await chat.save();
    }
    if (!chat) {
      chat = new Chat({ participants: [userId, peerId], messages: [] });
      await chat.save();
    }
    res.json({ messages: chat.messages, chat });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Socket.io logic
let activeUsers = new Set();
const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  socket.on("error", (error) => {
    console.log("Socket error:", error);
  });
  
  socket.on("privateMessage", async (data) => {
    const { senderId, receiverId, message, fileUrl, productUrl } = data;
    try {
      let chat = await Chat.findOne({ participants: { $all: [senderId, receiverId] } });
      if (!chat) {
        chat = new Chat({ participants: [senderId, receiverId], messages: [] });
      } else if (chat.deletedBy?.includes(senderId)) {
        chat.deletedBy = chat.deletedBy.filter(id => id !== senderId);
      }
      
      const newMessage = {
        senderId,
        receiverId,
        message,
        fileUrl,
        productUrl,
        sent: true,
        delivered: false,
        seen: false,
        timestamp: new Date()
      };
      
      chat.messages.push(newMessage);
      chat.updatedAt = Date.now();
      await chat.save();

      // Mark as delivered if receiver is online
      const isReceiverOnline = activeUsers.has(receiverId);
      if (isReceiverOnline) {
        newMessage.delivered = true;
        await chat.save();
      }

      socket.emit("messageReceived", { 
        senderId, 
        receiverId, 
        message, 
        fileUrl, 
        productUrl, 
        status: isReceiverOnline ? 'delivered' : 'sent',
        timestamp: chat.updatedAt 
      });
      
      socket.to(receiverId).emit("messageReceived", { 
        senderId, 
        receiverId, 
        message, 
        fileUrl, 
        productUrl, 
        status: 'delivered',
        timestamp: chat.updatedAt 
      });

      await updateUserList(senderId, receiverId, message);
      await updateUserList(receiverId, senderId, message);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("markMessageDelivered", async ({ messageId, chatId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (chat) {
        const message = chat.messages.id(messageId);
        if (message) {
          message.delivered = true;
          await chat.save();
        }
      }
    } catch (err) {
      console.error("Error marking message delivered:", err);
    }
  });

  socket.on("markMessageSeen", async ({ messageId, chatId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (chat) {
        const message = chat.messages.id(messageId);
        if (message) {
          message.seen = true;
          message.delivered = true;
          await chat.save();
        }
      }
    } catch (err) {
      console.error("Error marking message seen:", err);
    }
  });

  socket.on("activeUser", (userId) => {
    userSocketMap.set(socket.id, userId);
    activeUsers.add(userId);
    io.emit("updateActiveUsers", Array.from(activeUsers));
  });

  socket.on("joinChat", (userId) => {
    socket.join(userId);
  });

  socket.on("markMessagesAsSeen", async ({ chatId, userId, peerId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (chat) {
        // Mark all messages from peerId to userId as seen
        const messagesToUpdate = chat.messages.filter(
          msg => msg.senderId === peerId && msg.receiverId === userId && !msg.seen
        );
        
        messagesToUpdate.forEach(msg => {
          msg.seen = true;
          msg.delivered = true;
        });
        
        await chat.save();
        
        // Emit real-time status update to sender
        socket.to(peerId).emit("messageStatusUpdated", {
          chatId,
          messages: messagesToUpdate.map(msg => ({
            messageId: msg._id,
            status: 'read',
            timestamp: new Date()
          }))
        });
      }
    } catch (err) {
      console.error("Error marking messages as seen:", err);
    }
  });

  socket.on("markMessagesAsDelivered", async ({ chatId, userId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (chat) {
        // Mark all undelivered messages to userId as delivered
        const messagesToUpdate = chat.messages.filter(
          msg => msg.receiverId === userId && !msg.delivered
        );
        
        messagesToUpdate.forEach(msg => {
          msg.delivered = true;
        });
        
        await chat.save();
        
        // Emit real-time status update to sender
        messagesToUpdate.forEach(msg => {
          socket.to(msg.senderId).emit("messageStatusUpdated", {
            chatId,
            messageId: msg._id,
            status: 'delivered',
            timestamp: new Date()
          });
        });
      }
    } catch (err) {
      console.error("Error marking messages as delivered:", err);
    }
  });

  socket.on("disconnect", () => {
    const userId = userSocketMap.get(socket.id);
    if (userId) {
      activeUsers.delete(userId);
      userSocketMap.delete(socket.id);
      io.emit("updateActiveUsers", Array.from(activeUsers));
    }
  });
});

async function updateUserList(userId, peerId, lastMessage) {
  try {
    let userList = await UserList.findOne({ userId });
    if (!userList) {
      userList = new UserList({ userId, chatPartners: [] });
    }
    const peerIndex = userList.chatPartners.findIndex(partner => partner.peerId === peerId);
    if (peerIndex === -1) {
      userList.chatPartners.push({ peerId, lastMessage, timestamp: Date.now() });
    } else {
      userList.chatPartners[peerIndex].lastMessage = lastMessage;
      userList.chatPartners[peerIndex].timestamp = Date.now();
    }
    await userList.save();
  } catch (err) {
    console.error("Error updating user list:", err);
  }
}

server.listen(5000, () => {
  console.log("Server listening on port 5000");
});
