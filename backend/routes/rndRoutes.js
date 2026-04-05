const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  createRnDRequest,
  getRnDRequests,
  getRnDRequest,
  approveRnDRequest,
  rejectRnDRequest,
  issueRnDMaterials,
  getUsageLogs,
} = require('../controllers/rndController');

// All routes require authentication
router.use(protect);

// R&D staff routes
router.post('/request', authorize(ROLES.ADMIN, ROLES.STAFF_RND), createRnDRequest);
router.get('/requests', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getRnDRequests);
router.get('/request/:id', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getRnDRequest);
router.get('/usage-logs', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getUsageLogs);

// Approval / Issue
router.put('/request/:id/approve', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), approveRnDRequest);
router.put('/request/:id/reject', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), rejectRnDRequest);
router.put('/request/:id/issue', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), issueRnDMaterials);

module.exports = router;
