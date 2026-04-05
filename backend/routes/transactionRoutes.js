const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');
const {
  getTransactions,
  getItemTransactions,
  getUserTransactions,
} = require('../controllers/transactionController');

// All routes require authentication
router.use(protect);

router.get('/', getTransactions);
router.get('/item/:itemCode', getItemTransactions);
router.get('/user/:userId', authorize(ROLES.ADMIN), getUserTransactions);

module.exports = router;
