const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { processScan } = require('../controllers/scanController');

// All scan routes require authentication
router.use(protect);

/**
 * POST /api/v1/scan
 * Body: { qrData: "ITEMCODE|PACKQTY" }
 * Emits socket event to the requesting user's dashboard
 */
router.post('/', processScan);

module.exports = router;
