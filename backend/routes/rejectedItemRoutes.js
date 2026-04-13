const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getRejectedItems,
  getRejectedStats,
} = require('../controllers/rejectedItemController');

// All routes require authentication
router.use(protect);

router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), getRejectedItems);
router.get('/stats', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), getRejectedStats);

module.exports = router;
