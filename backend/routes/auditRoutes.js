const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getLogs,
  getUserLogs,
} = require('../controllers/auditController');

// All routes require Admin access
router.use(protect, authorize(ROLES.ADMIN));

router.get('/logs', getLogs);
router.get('/logs/user/:userId', getUserLogs);

module.exports = router;

