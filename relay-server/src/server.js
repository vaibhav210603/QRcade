// src/server.js - Main server entry point
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const sessions = require('./sessions');
const { createSessionEndpoint, healthEndpoint } = require('./controllers');
const { setupSocketHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure appropriately for production
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// REST endpoints
app.get('/',(req,res)=>{res.json({message:'QRcade Relay Server running successfully on 3000'})})
app.post('/createSession', createSessionEndpoint);
app.get('/health', healthEndpoint);

// Serve controller page
app.get('/ctl/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  res.sendFile(path.join(__dirname, '../public/controller.html'));
});



// Setup Socket.IO handlers
setupSocketHandlers(io);

// Cleanup expired sessions every 30 seconds
setInterval(() => {
  sessions.cleanupExpiredSessions();
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 QRcade Relay Server running on port ${PORT}`);
  console.log(`📱 Controller URL: http://localhost:${PORT}/ctl/{sessionId}`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin/sessions`);
});

module.exports = { app, server, io };


