const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  inwardStock,
  issueStock,
  lowStock,
  parseQRCode,
  getItemQR,
} = require('../controllers/inventoryController');

// All routes require authentication
router.use(protect);

// Low stock, QR parse & QR generation (any authenticated user)
router.get('/low-stock', lowStock);
router.post('/parse-qr', parseQRCode);
router.get('/qr/:itemCode', getItemQR);

// Inward & Issue
router.post('/inward', authorize(ROLES.ADMIN, ROLES.STAFF_STORE, ROLES.STAFF_QUALITY), inwardStock);
router.post('/issue', authorize(ROLES.ADMIN, ROLES.STAFF_STORE, ROLES.STAFF_RND), issueStock);

// CRUD
router.route('/')
  .get(getItems)
  .post(authorize(ROLES.ADMIN, ROLES.STAFF_STORE), createItem);

router.route('/:id')
  .get(getItem)
  .put(authorize(ROLES.ADMIN, ROLES.STAFF_STORE), updateItem);

module.exports = router;
