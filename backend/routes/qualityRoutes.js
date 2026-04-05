const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getInspections,
  getInspection,
  approve,
  reject,
} = require('../controllers/qualityController');

// All routes require authentication
router.use(protect);

router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), getInspections);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), getInspection);
router.put('/:id/approve', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), approve);
router.put('/:id/reject', authorize(ROLES.ADMIN, ROLES.STAFF_QUALITY), reject);

module.exports = router;
