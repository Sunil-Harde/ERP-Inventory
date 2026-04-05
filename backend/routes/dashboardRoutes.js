const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getStats,
  getTopItems,
  getDepartmentUsage,
  getStaffActivity,
  getStockPrediction,
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(protect);

router.get('/stats', getStats);
router.get('/top-items', getTopItems);

// Admin only
router.get('/department-usage', authorize(ROLES.ADMIN), getDepartmentUsage);
router.get('/staff-activity', authorize(ROLES.ADMIN), getStaffActivity);
router.get('/stock-prediction/:itemCode', authorize(ROLES.ADMIN), getStockPrediction);

module.exports = router;
