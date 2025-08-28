// src/socketHandlers/index.js - Main Socket.IO setup
const sessions = require('../sessions');

/**
 * Setup all Socket.IO event handlers
 */
function setupSocketHandlers(io) {
  console.log('🔌 Setting up Socket.IO handlers');
  
  io.on('connection', (socket) => {
    console.log(`🔗 New socket connection: ${socket.id}`);
    
    // Store socket metadata
    socket.data = {
      role: null,
      sessionId: null,
      player: null,
      connectedAt: Date.now()
    };
    
    // Handle initial join event
    socket.on('join', async (data) => {
      await handleJoin(io, socket, data);
    });
    
    // Handle input events from controllers
    socket.on('input', (data) => {
      handleInput(io, socket, data);
    });
    
    // Handle heartbeat/ping
    socket.on('ping', (data) => {
      socket.emit('pong', { ...data, serverTime: Date.now() });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      handleDisconnect(io, socket, reason);
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket ${socket.id} error:`, error);
    });
  });
  
  // Track connection stats
  setInterval(() => {
    const connectedSockets = io.engine.clientsCount;
    const activeSessions = sessions.getActiveSessionsCount();
    
    if (connectedSockets > 0) {
      console.log(`📊 Connected sockets: ${connectedSockets}, Active sessions: ${activeSessions}`);
    }
  }, 60000); // Every minute
}

/**
 * Handle socket join events
 */
async function handleJoin(io, socket, data) {
  try {
    const { sessionId, role, player } = data;
    
    // Validate required fields
    if (!sessionId || !role) {
      socket.emit('joinError', { error: 'sessionId and role are required' });
      return;
    }
    
    // Validate role
    if (!['extension', 'controller'].includes(role)) {
      socket.emit('joinError', { error: 'Invalid role. Must be extension or controller' });
      return;
    }
    
    // Get session
    const session = sessions.getSession(sessionId);
    if (!session) {
      socket.emit('joinError', { error: 'Session not found or expired' });
      return;
    }
    
    // Handle extension join
    if (role === 'extension') {
      await handleExtensionJoin(io, socket, sessionId, session);
      return;
    }
    
    // Handle controller join
    if (role === 'controller') {
      if (!player || !['p1', 'p2'].includes(player)) {
        socket.emit('joinError', { error: 'Controller must specify player (p1 or p2)' });
        return;
      }
      
      await handleControllerJoin(io, socket, sessionId, player, session);
      return;
    }
    
  } catch (error) {
    console.error('Error handling join:', error);
    socket.emit('joinError', { error: 'Failed to join session' });
  }
}

/**
 * Handle extension joining session
 */
async function handleExtensionJoin(io, socket, sessionId, session) {
  // Check if extension already connected
  if (session.extensionSocketId && session.extensionSocketId !== socket.id) {
    socket.emit('joinError', { error: 'Extension already connected to this session' });
    return;
  }
  
  // Set extension socket
  sessions.setExtensionSocket(sessionId, socket.id);
  
  // Join room
  const roomName = `session:${sessionId}`;
  await socket.join(roomName);
  
  // Update socket metadata
  socket.data.role = 'extension';
  socket.data.sessionId = sessionId;
  
  console.log(`🔌 Extension joined session ${sessionId}`);
  
  // Send acknowledgment
  socket.emit('joinAck', {
    success: true,
    role: 'extension',
    sessionId,
    connectedPlayers: sessions.getConnectedPlayersCount(sessionId),
    isReady: sessions.isSessionReady(sessionId)
  });
  
  // Notify room about extension connection
  socket.to(roomName).emit('extensionConnected', { sessionId });
}

/**
 * Handle controller joining session
 */
async function handleControllerJoin(io, socket, sessionId, player, session) {
  // Try to add player to session
  const result = sessions.addPlayer(sessionId, player, socket.id);
  
  if (!result.success) {
    socket.emit('joinError', { error: result.error });
    return;
  }
  
  // Join room
  const roomName = `session:${sessionId}`;
  await socket.join(roomName);
  
  // Update socket metadata
  socket.data.role = 'controller';
  socket.data.sessionId = sessionId;
  socket.data.player = player;
  
  console.log(`🎮 Controller ${player} joined session ${sessionId}`);
  
  // Send acknowledgment to controller
  socket.emit('joinAck', {
    success: true,
    role: 'controller',
    assigned: player,
    sessionId,
    connectedPlayers: sessions.getConnectedPlayersCount(sessionId)
  });
  
  // Notify room about new controller
  socket.to(roomName).emit('controllerJoined', {
    sessionId,
    player,
    connectedPlayers: sessions.getConnectedPlayersCount(sessionId),
    isReady: sessions.isSessionReady(sessionId)
  });
  
  // If session is now ready, notify extension
  if (sessions.isSessionReady(sessionId)) {
    io.to(roomName).emit('sessionReady', {
      sessionId,
      connectedPlayers: sessions.getConnectedPlayersCount(sessionId)
    });
  }
}

/**
 * Handle input events from controllers
 */
function handleInput(io, socket, data) {
  try {
    const { sessionId, type, key, code, x, y } = data;
    const socketSessionId = socket.data.sessionId;
    const player = socket.data.player;
    
    // Validate socket is controller
    if (socket.data.role !== 'controller') {
      return; // Silently ignore
    }
    
    // Validate session matches
    if (!sessionId || sessionId !== socketSessionId) {
      return; // Silently ignore
    }
    
    // Validate required fields
    if (!type) {
      return; // Silently ignore
    }
    
    // Get session to validate
    const session = sessions.getSession(sessionId);
    if (!session) {
      return; // Session expired
    }
    
    // Record input activity
    sessions.recordInput(sessionId);
    
    // Create payload for extension
    const payload = {
      sessionId,
      from: player,
      type,
      key,
      code,
      x,
      y,
      ts: Date.now()
    };
    
    // Remove undefined fields to keep message compact
    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k];
    });
    
    // Forward to extension via room
    const roomName = `session:${sessionId}`;
    io.to(roomName).emit('sessionInput', payload);
    
    // Optional: log high-frequency input at debug level
    if (process.env.LOG_INPUTS === 'true') {
      console.log(`⌨️ Input from ${player}: ${type} ${key || ''}`);
    }
    
  } catch (error) {
    console.error('Error handling input:', error);
  }
}

/**
 * Handle socket disconnection
 */
function handleDisconnect(io, socket, reason) {
  const { role, sessionId, player } = socket.data;
  
  console.log(`❌ Socket ${socket.id} disconnected: ${reason} (role: ${role}, session: ${sessionId})`);
  
  if (!sessionId) return;
  
  const roomName = `session:${sessionId}`;
  
  if (role === 'extension') {
    // Extension disconnected
    sessions.removeExtension(sessionId);
    
    // Notify controllers
    socket.to(roomName).emit('extensionDisconnected', {
      sessionId,
      reason: 'Extension disconnected'
    });
    
  } else if (role === 'controller' && player) {
    // Controller disconnected
    const removedPlayer = sessions.removePlayer(sessionId, socket.id);
    
    if (removedPlayer) {
      // Notify room
      io.to(roomName).emit('controllerLeft', {
        sessionId,
        player: removedPlayer,
        connectedPlayers: sessions.getConnectedPlayersCount(sessionId),
        isReady: sessions.isSessionReady(sessionId)
      });
    }
  }
}

module.exports = {
  setupSocketHandlers
};