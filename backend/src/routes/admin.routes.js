const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listAllOrders, getAdminOrder, assignAndBook, addTrackingEvent, updateOrderStatus,
  listCustomers, createInvoice, listAdminInvoices, sendInvoice,
  listMISReports, generateMIS, downloadMIS,
  listAdmins, createAdmin, updateAdmin, getDashboardStats,
} = require('../controllers/admin.controller');

router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/orders', listAllOrders);
router.get('/orders/:id', getAdminOrder);
router.put('/orders/:id/assign', assignAndBook);
router.post('/orders/:id/tracking', addTrackingEvent);
router.put('/orders/:id/status', updateOrderStatus);

router.get('/customers', listCustomers);

router.post('/invoices', createInvoice);
router.get('/invoices', listAdminInvoices);
router.post('/invoices/:id/send', sendInvoice);

router.get('/mis', listMISReports);
router.post('/mis/generate', generateMIS);
router.get('/mis/:id/download', downloadMIS);

router.get('/admins', requireRole('SUPER_ADMIN'), listAdmins);
router.post('/admins', requireRole('SUPER_ADMIN'), createAdmin);
router.put('/admins/:id', requireRole('SUPER_ADMIN'), updateAdmin);

module.exports = router;
