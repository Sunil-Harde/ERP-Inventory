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
  // BOM
  createBOMHandler,
  listBOMs,
  approveBOMHandler,
  issueBOMHandler,
  rejectBOMHandler, // ✨ NEW: Imported the Reject Handler
  getReceipts,
} = require('../controllers/rndController');

// All routes require authentication
router.use(protect);

// ── R&D Material Requests ──
router.post('/request', authorize(ROLES.ADMIN, ROLES.STAFF_RND), createRnDRequest);
router.get('/requests', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getRnDRequests);
router.get('/request/:id', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getRnDRequest);
router.get('/usage-logs', authorize(ROLES.ADMIN, ROLES.STAFF_RND), getUsageLogs);

// Approval / Issue
router.put('/request/:id/approve', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), approveRnDRequest);
router.put('/request/:id/reject', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), rejectRnDRequest);
router.put('/request/:id/issue', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), issueRnDMaterials);

// ── BOM (Bill of Materials) — inside R&D ──
router.post('/bom', authorize(ROLES.ADMIN, ROLES.STAFF_RND), createBOMHandler);
router.get('/bom', authorize(ROLES.ADMIN, ROLES.STAFF_RND, ROLES.STAFF_STORE), listBOMs);
router.put('/bom/:id/approve', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), approveBOMHandler);

// ✨ NEW: The Reject route for Shop 1
router.put('/bom/:id/reject', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), rejectBOMHandler); 

router.put('/bom/:id/issue', authorize(ROLES.ADMIN, ROLES.STAFF_STORE), issueBOMHandler);

// ── Production Receipts ──
router.get('/receipts', authorize(ROLES.ADMIN, ROLES.STAFF_RND, ROLES.STAFF_STORE), getReceipts);

module.exports = router;