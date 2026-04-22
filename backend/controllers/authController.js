const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { AUDIT_ACTIONS, DEPARTMENT_MAP } = require('../utils/constants');
const { logAction } = require('../services/auditService');

// ── Cookie config helper ──
const isProduction = () => process.env.NODE_ENV === 'production';

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/',
  maxAge: maxAgeMs,
});

// Parse duration strings like "15m", "7d" → milliseconds
const parseDuration = (str) => {
  const val = parseInt(str);
  if (str.endsWith('d')) return val * 24 * 60 * 60 * 1000;
  if (str.endsWith('h')) return val * 60 * 60 * 1000;
  if (str.endsWith('m')) return val * 60 * 1000;
  if (str.endsWith('s')) return val * 1000;
  return val;
};

// Hash a token for storage
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Admin only
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department: department || DEPARTMENT_MAP[role] || 'store',
    });

    await logAction(AUDIT_ACTIONS.USER_REGISTERED, req.user, {
      details: { registeredUser: user.email, role: user.role },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user — set HttpOnly cookies
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Contact admin.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    // Single session: delete any existing session for this user
    await Session.deleteMany({ userId: user._id });

    // Store new session with hashed refresh token + device info
    const refreshExpireMs = parseDuration(process.env.JWT_REFRESH_EXPIRE || '7d');
    await Session.create({
      userId: user._id,
      refreshToken: hashToken(refreshToken),
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.connection?.remoteAddress || '',
      expiresAt: new Date(Date.now() + refreshExpireMs),
    });

    // Set HttpOnly cookies
    const accessExpireMs = parseDuration(process.env.JWT_EXPIRE || '15m');
    res.cookie('erp_access', accessToken, cookieOptions(accessExpireMs));
    res.cookie('erp_refresh', refreshToken, cookieOptions(refreshExpireMs));

    // Audit
    await logAction(AUDIT_ACTIONS.USER_LOGIN, user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token using refresh token cookie
 * @route   POST /api/v1/auth/refresh
 * @access  Public (cookie-based)
 */
const refreshTokenHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.erp_refresh;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token. Please login again.',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      // Clear invalid cookies
      res.clearCookie('erp_access', { path: '/' });
      res.clearCookie('erp_refresh', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. Please login again.',
      });
    }

    // Find session with hashed token
    const hashedToken = hashToken(token);
    const session = await Session.findOne({
      userId: decoded.id,
      refreshToken: hashedToken,
    });

    if (!session) {
      // Token reuse detected — invalidate all sessions for this user
      await Session.deleteMany({ userId: decoded.id });
      res.clearCookie('erp_access', { path: '/' });
      res.clearCookie('erp_refresh', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'Session not found. Possible token reuse. Please login again.',
      });
    }

    // Device binding check
    const currentUA = req.headers['user-agent'] || '';
    if (session.userAgent && session.userAgent !== currentUA) {
      // Device mismatch — possible token theft
      await Session.deleteMany({ userId: decoded.id });
      res.clearCookie('erp_access', { path: '/' });
      res.clearCookie('erp_refresh', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'Device mismatch. Session invalidated. Please login again.',
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      await Session.deleteMany({ userId: decoded.id });
      res.clearCookie('erp_access', { path: '/' });
      res.clearCookie('erp_refresh', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'User not found or deactivated.',
      });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    const accessExpireMs = parseDuration(process.env.JWT_EXPIRE || '15m');
    res.cookie('erp_access', newAccessToken, cookieOptions(accessExpireMs));

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout — clear session & cookies
 * @route   POST /api/v1/auth/logout
 * @access  Private (or cookie-based)
 */
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.erp_refresh;

    if (refreshToken) {
      // Delete session from DB
      const hashedToken = hashToken(refreshToken);
      await Session.deleteOne({ refreshToken: hashedToken });
    }

    // If user is attached (via protect middleware), also delete by userId
    if (req.user) {
      await Session.deleteMany({ userId: req.user._id });
      await logAction(AUDIT_ACTIONS.USER_LOGIN, req.user, {
        details: { action: 'logout' },
      });
    }

    // Clear cookies
    res.clearCookie('erp_access', { path: '/' });
    res.clearCookie('erp_refresh', { path: '/' });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Invalidate all sessions — force re-login with new password
    await Session.deleteMany({ userId: user._id });
    res.clearCookie('erp_access', { path: '/' });
    res.clearCookie('erp_refresh', { path: '/' });

    await logAction(AUDIT_ACTIONS.PASSWORD_CHANGED, req.user);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshTokenHandler,
  logout,
  getMe,
  changePassword,
};
