// src/controllers.js - REST endpoint handlers
const sessions = require('./sessions');

/**
 * Create a new session
 * POST /createSession
 * Body: { preferredPlayers?: number, gameUrl?: string }
 */
function createSessionEndpoint(req, res) {
  try {
    const { preferredPlayers = 2, gameUrl } = req.body;
    
    // Validate input
    if (preferredPlayers && (preferredPlayers < 1 || preferredPlayers > 4)) {
      return res.status(400).json({
        error: 'preferredPlayers must be between 1 and 4'
      });
    }
    
    // Create session
    const session = sessions.createSession({
      preferredPlayers,
      gameUrl,
      createdVia: 'REST',
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Generate controller URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const controllerUrl = `${baseUrl}/ctl/${session.sessionId}`;
    
    console.log(`🎮 Session ${session.sessionId} created via REST`);
    
    res.status(201).json({
      sessionId: session.sessionId,
      controllerUrl,
      expiresAt: session.expiresAt,
      preferredPlayers: session.metadata.preferredPlayers
    });
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session'
    });
  }
}

/**
 * Health check endpoint
 * GET /health
 */
function healthEndpoint(req, res) {
  const activeSessions = sessions.getActiveSessionsCount();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeSessions,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
}

/**
 * Poll queued messages for a session (for extensions)
 * GET /poll/:sessionId
 */
function pollMessagesEndpoint(req, res) {
  try {
    const { sessionId } = req.params;
    const session = sessions.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    const messages = sessions.drainMessages(sessionId);
    res.json(messages);
  } catch (error) {
    console.error('Error polling messages:', error);
    res.status(500).json({ error: 'Failed to poll messages' });
  }
}

/**
 * Invalidate session (admin)
 * POST /invalidateSession
 * Body: { sessionId: string }
 */
function invalidateSessionEndpoint(req, res) {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }
    
    const deleted = sessions.deleteSession(sessionId);
    
    if (deleted) {
      console.log(`🗑️ Admin invalidated session ${sessionId}`);
      res.json({
        success: true,
        message: `Session ${sessionId} invalidated`
      });
    } else {
      res.status(404).json({
        error: 'Session not found'
      });
    }
    
  } catch (error) {
    console.error('Error invalidating session:', error);
    res.status(500).json({
      error: 'Failed to invalidate session'
    });
  }
}

/**
 * Get session info (admin/debug)
 * GET /session/:sessionId
 */
function getSessionEndpoint(req, res) {
  try {
    const { sessionId } = req.params;
    const session = sessions.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired'
      });
    }
    
    // Return sanitized session info
    res.json({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      hasExtension: !!session.extensionSocketId,
      players: {
        p1: {
          connected: session.players.p1.connected,
          joinedAt: session.players.p1.joinedAt
        },
        p2: {
          connected: session.players.p2.connected,
          joinedAt: session.players.p2.joinedAt
        }
      },
      connectedPlayersCount: sessions.getConnectedPlayersCount(sessionId),
      isReady: sessions.isSessionReady(sessionId),
      stats: session.stats,
      metadata: session.metadata
    });
    
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      error: 'Failed to get session info'
    });
  }
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
}

module.exports = {
  createSessionEndpoint,
  healthEndpoint,
  invalidateSessionEndpoint,
  getSessionEndpoint,
  pollMessagesEndpoint,
  errorHandler,
  notFoundHandler
};