/**
 * Socket Manager — singleton that holds the io instance
 * so any controller can emit events without circular imports
 */

let io = null;

const init = (httpServer) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // ── JWT Authentication Middleware for Socket.IO ──
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.userId = user._id.toString();
      socket.userInfo = { name: user.name, role: user.role };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection Handler ──
  io.on('connection', (socket) => {
    // Join user-specific room
    socket.join(socket.userId);
    console.log(`🔌 Socket connected: ${socket.userInfo.name} (${socket.userId})`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.userInfo?.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

/**
 * Emit an event to a specific user's room
 */
const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
};

module.exports = { init, getIO, emitToUser };
