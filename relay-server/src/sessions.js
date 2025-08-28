// src/sessions.js - In-memory session store
const crypto = require('crypto');

// In-memory session storage
const sessions = new Map();

// Session TTL in milliseconds (10 minutes)
const SESSION_TTL = 10 * 60 * 1000;

/**
 * Generate cryptographically secure session ID
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new session
 */
function createSession(metadata = {}) {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const session = {
    sessionId,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    extensionSocketId: null,
    messageQueue: [],
    players: {
      p1: { socketId: null, connected: false, joinedAt: null },
      p2: { socketId: null, connected: false, joinedAt: null }
    },
    metadata: {
      gameUrl: metadata.gameUrl || null,
      preferredPlayers: metadata.preferredPlayers || 2,
      ...metadata
    },
    stats: {
      totalInputs: 0,
      lastActivity: now
    }
  };
  
  sessions.set(sessionId, session);
  console.log(`📝 Created session ${sessionId}`);
  return session;
}

/**
 * Get session by ID
 */
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Check if session expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    console.log(`⏰ Session ${sessionId} expired and removed`);
    return null;
  }
  
  return session;
}

/**
 * Update session - extend TTL on activity
 */
function updateSession(sessionId, updates = {}) {
  const session = getSession(sessionId);
  if (!session) return null;
  
  // Extend TTL on activity
  session.expiresAt = Date.now() + SESSION_TTL;
  session.stats.lastActivity = Date.now();
  
  // Apply updates
  Object.assign(session, updates);
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Set extension socket for session
 */
function setExtensionSocket(sessionId, socketId) {
  const session = getSession(sessionId);
  if (!session) return false;
  
  session.extensionSocketId = socketId;
  updateSession(sessionId);
  console.log(`🔌 Extension connected to session ${sessionId}`);
  return true;
}

/**
 * Add player to session
 */
function addPlayer(sessionId, player, socketId) {
  const session = getSession(sessionId);
  if (!session) return { success: false, error: 'Session not found' };
  
  // Validate player slot
  if (!['p1', 'p2'].includes(player)) {
    return { success: false, error: 'Invalid player slot' };
  }
  
  // Check if slot is available
  if (session.players[player].connected) {
    return { success: false, error: 'Player slot already taken' };
  }
  
  // Assign player
  session.players[player] = {
    socketId,
    connected: true,
    joinedAt: Date.now()
  };
  
  updateSession(sessionId);
  console.log(`👤 Player ${player} joined session ${sessionId}`);
  return { success: true, assigned: player };
}

/**
 * Remove player from session
 */
function removePlayer(sessionId, socketId) {
  const session = getSession(sessionId);
  if (!session) return null;
  
  let removedPlayer = null;
  
  // Find player by socket ID
  for (const [player, data] of Object.entries(session.players)) {
    if (data.socketId === socketId) {
      session.players[player] = { socketId: null, connected: false, joinedAt: null };
      removedPlayer = player;
      console.log(`👋 Player ${player} left session ${sessionId}`);
      break;
    }
  }
  
  updateSession(sessionId);
  return removedPlayer;
}

/**
 * Remove extension from session
 */
function removeExtension(sessionId) {
  const session = getSession(sessionId);
  if (!session) return false;
  
  session.extensionSocketId = null;
  updateSession(sessionId);
  console.log(`🔌 Extension disconnected from session ${sessionId}`);
  return true;
}

/**
 * Get player by socket ID
 */
function getPlayerBySocket(sessionId, socketId) {
  const session = getSession(sessionId);
  if (!session) return null;
  
  for (const [player, data] of Object.entries(session.players)) {
    if (data.socketId === socketId) {
      return player;
    }
  }
  
  return null;
}

/**
 * Check if session is ready (has extension and at least one player)
 */
function isSessionReady(sessionId) {
  const session = getSession(sessionId);
  if (!session || !session.extensionSocketId) return false;
  
  const hasPlayers = Object.values(session.players).some(p => p.connected);
  return hasPlayers;
}

/**
 * Get connected players count
 */
function getConnectedPlayersCount(sessionId) {
  const session = getSession(sessionId);
  if (!session) return 0;
  
  return Object.values(session.players).filter(p => p.connected).length;
}

/**
 * Record input activity
 */
function recordInput(sessionId) {
  const session = updateSession(sessionId);
  if (session) {
    session.stats.totalInputs++;
  }
}

/**
 * Enqueue a message for the session's poll queue
 */
function enqueueMessage(sessionId, payload) {
  const session = getSession(sessionId);
  if (!session) return false;
  // Cap queue size to avoid unbounded growth (keep latest 1000)
  if (session.messageQueue.length > 1000) {
    session.messageQueue.splice(0, session.messageQueue.length - 1000);
  }
  session.messageQueue.push(payload);
  updateSession(sessionId);
  return true;
}

/**
 * Drain and return all queued messages for a session
 */
function drainMessages(sessionId) {
  const session = getSession(sessionId);
  if (!session) return [];
  const messages = session.messageQueue.slice();
  session.messageQueue.length = 0;
  updateSession(sessionId);
  return messages;
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
  }
}

/**
 * Get all active sessions (for admin)
 */
function getAllSessions() {
  const now = Date.now();
  const activeSessions = [];
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now <= session.expiresAt) {
      activeSessions.push({
        sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        hasExtension: !!session.extensionSocketId,
        connectedPlayers: getConnectedPlayersCount(sessionId),
        totalInputs: session.stats.totalInputs,
        lastActivity: session.stats.lastActivity
      });
    }
  }
  
  return activeSessions;
}

/**
 * Get active sessions count
 */
function getActiveSessionsCount() {
  const now = Date.now();
  let count = 0;
  
  for (const session of sessions.values()) {
    if (now <= session.expiresAt) count++;
  }
  
  return count;
}

/**
 * Delete session (admin function)
 */
function deleteSession(sessionId) {
  const deleted = sessions.delete(sessionId);
  if (deleted) {
    console.log(`🗑️ Manually deleted session ${sessionId}`);
  }
  return deleted;
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  setExtensionSocket,
  addPlayer,
  removePlayer,
  removeExtension,
  getPlayerBySocket,
  isSessionReady,
  getConnectedPlayersCount,
  recordInput,
  cleanupExpiredSessions,
  getAllSessions,
  getActiveSessionsCount,
  deleteSession,
  enqueueMessage,
  drainMessages
};