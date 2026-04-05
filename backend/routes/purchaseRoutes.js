const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  receiveMaterials,
  updatePurchaseOrder,
} = require('../controllers/purchaseController');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(authorize(ROLES.ADMIN, ROLES.STAFF_PURCHASE), getPurchaseOrders)
  .post(authorize(ROLES.ADMIN, ROLES.STAFF_PURCHASE), createPurchaseOrder);

router.route('/:id')
  .get(getPurchaseOrder)
  .put(authorize(ROLES.ADMIN, ROLES.STAFF_PURCHASE), updatePurchaseOrder);

router.put('/:id/receive', authorize(ROLES.ADMIN, ROLES.STAFF_PURCHASE), receiveMaterials);

module.exports = router;
