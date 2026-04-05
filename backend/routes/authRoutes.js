const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  register,
  login,
  getMe,
  changePassword,
} = require('../controllers/authController');

// Public
router.post('/login', login);

// Protected
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

// Admin only
router.post('/register', protect, authorize(ROLES.ADMIN), register);

module.exports = router;
