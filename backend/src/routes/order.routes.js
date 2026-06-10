const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createOrder, listOrders, getOrder, trackOrder,
  listInvoices, downloadInvoice,
  listAddresses, createAddress,
} = require('../controllers/order.controller');

// Public tracking — no auth required
router.get('/track/:docketNo', trackOrder);

// Customer routes — auth required
router.post('/orders', authenticate, requireRole('CUSTOMER'), createOrder);
router.get('/orders', authenticate, requireRole('CUSTOMER'), listOrders);
router.get('/orders/:docketNo', authenticate, requireRole('CUSTOMER'), getOrder);
router.get('/invoices', authenticate, requireRole('CUSTOMER'), listInvoices);
router.get('/invoices/:id/download', authenticate, requireRole('CUSTOMER'), downloadInvoice);
router.get('/addresses', authenticate, requireRole('CUSTOMER'), listAddresses);
router.post('/addresses', authenticate, requireRole('CUSTOMER'), createAddress);

module.exports = router;
