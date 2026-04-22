const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Protect routes — verify JWT from HttpOnly cookie (or Bearer header as fallback)
 * Also validates device binding via session.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Prefer HttpOnly cookie
    if (req.cookies?.erp_access) {
      token = req.cookies.erp_access;
    }
    // 2. Fallback: Authorization header (for mobile / API clients)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and check if active
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Contact admin.',
      });
    }

    // Validate session exists (ensures single-session & logout works)
    const session = await Session.findOne({ userId: user._id });
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    // Device binding check — compare userAgent
    const currentUA = req.headers['user-agent'] || '';
    if (session.userAgent && session.userAgent !== currentUA) {
      return res.status(401).json({
        success: false,
        message: 'Device mismatch. Please login again.',
      });
    }

    // Attach user to request
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please refresh.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

module.exports = { protect };
