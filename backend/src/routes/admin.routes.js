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
  getLiveShipmentDetail, checkRatesDirect, syncTracking,
} = require('../controllers/admin.controller');
const {
  listSavedConsignors, createSavedConsignor, updateSavedConsignor, deleteSavedConsignor,
  listSavedConsignees, createSavedConsignee, updateSavedConsignee, deleteSavedConsignee,
} = require('../controllers/settings.controller');

router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Orders
router.get('/orders', listAllOrders);
router.get('/orders/:id', getAdminOrder);
router.post('/orders/:id/check-rates', checkRates);
router.post('/orders/:id/assign', assignAndBook);
router.get('/orders/:id/live-detail', getLiveShipmentDetail);
router.post('/orders/:id/sync-tracking', syncTracking);
router.post('/orders/:id/tracking', addTrackingEvent);
router.patch('/orders/:id/status', updateOrderStatus);

// Direct booking (admin creates without customer)
router.post('/bookings/direct', createDirectBooking);
router.post('/bookings/check-rates', checkRatesDirect);

// Partner credentials
router.get('/partner-credentials', getPartnerCredentials);
router.put('/partner-credentials/:partner', upsertPartnerCredential);

// Saved Consignors
router.get('/saved-consignors', listSavedConsignors);
router.post('/saved-consignors', createSavedConsignor);
router.put('/saved-consignors/:id', updateSavedConsignor);
router.delete('/saved-consignors/:id', deleteSavedConsignor);

// Saved Consignees
router.get('/saved-consignees', listSavedConsignees);
router.post('/saved-consignees', createSavedConsignee);
router.put('/saved-consignees/:id', updateSavedConsignee);
router.delete('/saved-consignees/:id', deleteSavedConsignee);

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
