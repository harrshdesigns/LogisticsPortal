const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listAllOrders, getAdminOrder, checkRates, assignAndBook, createDirectBooking,
  addTrackingEvent, updateOrderStatus,
  getPartnerCredentials, upsertPartnerCredential,
  listCustomers,
  createInvoice, listAdminInvoices, sendInvoice,
  listMISReports, generateMIS, downloadMIS,
  listAdmins, createAdmin, updateAdmin, getDashboardStats,
} = require('../controllers/admin.controller');

router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Orders
router.get('/orders', listAllOrders);
router.get('/orders/:id', getAdminOrder);
router.post('/orders/:id/check-rates', checkRates);
router.post('/orders/:id/assign', assignAndBook);
router.post('/orders/:id/tracking', addTrackingEvent);
router.patch('/orders/:id/status', updateOrderStatus);

// Direct booking (admin creates without customer)
router.post('/bookings/direct', createDirectBooking);

// Partner credentials
router.get('/partner-credentials', getPartnerCredentials);
router.put('/partner-credentials/:partner', requireRole('SUPER_ADMIN'), upsertPartnerCredential);

// Customers
router.get('/customers', listCustomers);

// Invoices
router.post('/invoices', createInvoice);
router.get('/invoices', listAdminInvoices);
router.post('/invoices/:id/send', sendInvoice);

// MIS
router.get('/mis', listMISReports);
router.post('/mis/generate', generateMIS);
router.get('/mis/:id/download', downloadMIS);

// Team (SUPER_ADMIN only)
router.get('/admins', requireRole('SUPER_ADMIN'), listAdmins);
router.post('/admins', requireRole('SUPER_ADMIN'), createAdmin);
router.patch('/admins/:id', requireRole('SUPER_ADMIN'), updateAdmin);

module.exports = router;
