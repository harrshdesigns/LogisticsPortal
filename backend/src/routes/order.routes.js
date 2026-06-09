const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createOrder, listOrders, getOrder,
  listInvoices, downloadInvoice,
  listAddresses, createAddress,
} = require('../controllers/order.controller');

router.use(authenticate, requireRole('CUSTOMER'));

router.post('/orders', createOrder);
router.get('/orders', listOrders);
router.get('/orders/:docketNo', getOrder);
router.get('/invoices', listInvoices);
router.get('/invoices/:id/download', downloadInvoice);
router.get('/addresses', listAddresses);
router.post('/addresses', createAddress);

module.exports = router;
