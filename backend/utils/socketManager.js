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

  // ✅ AUTH
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.userInfo = { name: user.name };

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ✅ CONNECTION
  io.on('connection', (socket) => {

    // 🔥 Join user room (IMPORTANT)
    socket.join(socket.userId);

    console.log(`✅ Connected: ${socket.userInfo.name}`);

    // Optional manual join
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.userInfo.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket not initialized');
  return io;
};

// ✅ EMIT FUNCTION
const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
};

module.exports = { init, getIO, emitToUser };