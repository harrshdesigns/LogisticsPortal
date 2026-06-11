const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateDocketNo, generateInvoiceNo, success, failure } = require('../utils/helpers');
const { getAdapter } = require('../services/deliveryPartners');
const { generateInvoicePDF } = require('../services/pdf.service');
const { generateMISReport } = require('../services/mis.service');
const { sendMail, invoiceTemplate, statusUpdateTemplate } = require('../services/email.service');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// ─── Orders ─────────────────────────────────────────────────────────────────

async function listAllOrders(req, res) {
  try {
    const { page = 1, limit = 20, status, partner, customerId, dateFrom, dateTo, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;
    if (customerId) where.userId = customerId;
    if (search) where.clientDocketNo = { contains: search, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.createdAt.lte = d; }
    }
    if (partner) where.shipment = { partnerName: partner };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, company: true } },
          shipment: { select: { partnerName: true, partnerDocketNo: true, bookedAt: true } },
        },
        orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);
    return success(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    return failure(res, 'Failed to fetch orders', 500, e.message);
  }
}

async function getAdminOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, company: true, gstin: true, phone: true } },
        shipment: {
          include: {
            trackingEvents: { orderBy: { timestamp: 'desc' } },
            bookedByAdmin: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!order) return failure(res, 'Order not found', 404);
    return success(res, { order });
  } catch (e) {
    return failure(res, 'Failed to fetch order', 500, e.message);
  }
}

async function checkRates(req, res) {
  try {
    const { partnerName } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return failure(res, 'Order not found', 404);

    // Mock rates — replace with real API call per partner
    await new Promise(r => setTimeout(r, 800));
    const baseRate = (order.actualWeight || 1) * 45;
    const rates = {
      partner: partnerName,
      checkedAt: new Date().toISOString(),
      options: [
        { service: 'Standard', estimatedDays: '5-7', rate: Math.round(baseRate), gst: Math.round(baseRate * 0.18), total: Math.round(baseRate * 1.18) },
        { service: 'Express', estimatedDays: '2-3', rate: Math.round(baseRate * 1.6), gst: Math.round(baseRate * 1.6 * 0.18), total: Math.round(baseRate * 1.6 * 1.18) },
        { service: 'Priority', estimatedDays: '1', rate: Math.round(baseRate * 2.4), gst: Math.round(baseRate * 2.4 * 0.18), total: Math.round(baseRate * 2.4 * 1.18) },
      ],
      note: 'Rates are indicative. Final rate confirmed at booking.',
    };
    return success(res, { rates }, 'Rates fetched successfully');
  } catch (e) {
    return failure(res, 'Failed to check rates', 500, e.message);
  }
}

async function assignAndBook(req, res) {
  try {
    const {
      partnerName,
      // consignor override
      consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
      consignorCity, consignorState, consignorContactPerson, consignorPhone, consignorEmail,
      // consignee override
      consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
      consigneeCity, consigneeState, consigneeContactPerson, consigneePhone, consigneeEmail,
      // shipment overrides
      serviceType, actualWeight, packages, packagesType, unitWeight,
      dimensionL, dimensionW, dimensionH, dimensionUnit,
      appointmentDelivery, carrierRisk, ownersRisk, mallDelivery,
      paymentType, codPayeeName, codAmount,
      invoiceValue, invoiceNo, invoiceDate, ewayBillNo, hsnCode, quantity,
      itemDescription,
      // admin-only fields
      loginId, docketDate, pickupOption, billToParty,
      materialHold, waitingPermit, deliveryCode, notes,
    } = req.body;

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return failure(res, 'Order not found', 404);

    // Get partner credential if loginId not provided
    let resolvedLoginId = loginId;
    if (!resolvedLoginId) {
      const cred = await prisma.partnerCredential.findUnique({ where: { partner: partnerName } });
      resolvedLoginId = cred?.loginId || '';
    }

    const adapter = getAdapter(partnerName);
    const bookingData = {
      ...order, partnerName,
      consignorName: consignorName || order.consignorName,
      consignorCity: consignorCity || order.consignorCity,
      consigneeName: consigneeName || order.consigneeName,
      consigneeCity: consigneeCity || order.consigneeCity,
      actualWeight: actualWeight || order.actualWeight,
      serviceType: serviceType || order.serviceType,
    };
    const result = await adapter.bookShipment(bookingData);
    if (!result.success) return failure(res, 'Booking failed with partner', 400, result.rawResponse);

    const shipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        partnerName, partnerDocketNo: result.partnerDocketNo,
        loginId: resolvedLoginId,
        docketDate: docketDate ? new Date(docketDate) : new Date(),
        pickupOption: pickupOption || null,
        billToParty: billToParty || null,
        materialHold: !!materialHold,
        waitingPermit: !!waitingPermit,
        deliveryCode: deliveryCode || null,
        bookingResponse: result.rawResponse,
        bookedAt: new Date(),
        bookedByAdminId: req.user.id,
      },
      create: {
        orderId: order.id, partnerName, partnerDocketNo: result.partnerDocketNo,
        loginId: resolvedLoginId,
        docketDate: docketDate ? new Date(docketDate) : new Date(),
        pickupOption: pickupOption || null,
        billToParty: billToParty || null,
        materialHold: !!materialHold,
        waitingPermit: !!waitingPermit,
        deliveryCode: deliveryCode || null,
        bookingResponse: result.rawResponse,
        bookedAt: new Date(),
        bookedByAdminId: req.user.id,
      },
    });

    // Update order with any overrides from admin
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'BOOKED',
        ...(consignorName && { consignorName }),
        ...(consignorPin && { consignorPin }),
        ...(consignorAddressLine1 && { consignorAddressLine1 }),
        ...(consignorAddressLine2 !== undefined && { consignorAddressLine2 }),
        ...(consignorCity && { consignorCity }),
        ...(consignorState && { consignorState }),
        ...(consignorContactPerson && { consignorContactPerson }),
        ...(consignorPhone && { consignorPhone }),
        ...(consignorEmail && { consignorEmail }),
        ...(consigneeName && { consigneeName }),
        ...(consigneePin && { consigneePin }),
        ...(consigneeAddressLine1 && { consigneeAddressLine1 }),
        ...(consigneeAddressLine2 !== undefined && { consigneeAddressLine2 }),
        ...(consigneeCity && { consigneeCity }),
        ...(consigneeState && { consigneeState }),
        ...(consigneeContactPerson && { consigneeContactPerson }),
        ...(consigneePhone && { consigneePhone }),
        ...(consigneeEmail && { consigneeEmail }),
        ...(serviceType && { serviceType }),
        ...(actualWeight && { actualWeight: parseFloat(actualWeight) }),
        ...(packages && { packages: parseInt(packages) }),
        ...(packagesType && { packagesType }),
        ...(unitWeight && { unitWeight: parseFloat(unitWeight) }),
        ...(dimensionL && { dimensionL: parseFloat(dimensionL) }),
        ...(dimensionW && { dimensionW: parseFloat(dimensionW) }),
        ...(dimensionH && { dimensionH: parseFloat(dimensionH) }),
        ...(dimensionUnit && { dimensionUnit }),
        ...(itemDescription && { itemDescription }),
        ...(paymentType && { paymentType }),
        ...(codPayeeName !== undefined && { codPayeeName }),
        ...(codAmount !== undefined && { codAmount: codAmount ? parseFloat(codAmount) : null }),
        ...(invoiceValue !== undefined && { invoiceValue: invoiceValue ? parseFloat(invoiceValue) : null }),
        ...(invoiceNo !== undefined && { invoiceNo }),
        ...(invoiceDate !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
        ...(ewayBillNo !== undefined && { ewayBillNo }),
        ...(hsnCode !== undefined && { hsnCode }),
        ...(quantity !== undefined && { quantity: quantity ? parseInt(quantity) : null }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
    });

    await prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: 'BOOKED',
        description: `Shipment booked with ${partnerName}`,
        location: order.consignorCity || 'Origin',
        timestamp: new Date(),
        source: 'API',
      },
    });

    return success(res, { shipment }, 'Shipment booked successfully');
  } catch (e) {
    return failure(res, 'Booking failed', 500, e.message);
  }
}

// Direct booking by admin (no customer order)
async function createDirectBooking(req, res) {
  try {
    const {
      // Booking meta
      consignmentNo, consignmentType, requestedBy, primaryServiceProvider,
      // Consignor
      consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
      consignorCity, consignorState, consignorContactPerson, consignorCountryCode, consignorPhone, consignorEmail,
      // Consignee
      consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
      consigneeCity, consigneeState, consigneeContactPerson, consigneeCountryCode, consigneePhone, consigneeEmail,
      // Service
      serviceType, appointmentDelivery, carrierRisk, ownersRisk, mallDelivery,
      // Weight
      actualWeight,
      // Invoice / Commercial
      invoiceValue, invoiceNo, invoiceDate, ewayBillNo, hsnCode, quantity, codAmount,
      // Payment
      paymentType, codPayeeName,
      // Misc
      billToParty, docketDate, pickupOption, materialHold, waitingPermit, deliveryCode,
      promoCode, notes,
      // Package rows
      items,
    } = req.body;

    if (!consignorName || !consigneeName || !serviceType) {
      return failure(res, 'Consignor, consignee, and service type are required', 400);
    }

    // Use provided consignment number or auto-generate
    const clientDocketNo = consignmentNo && consignmentNo.trim()
      ? consignmentNo.trim()
      : await generateDocketNo();

    const order = await prisma.order.create({
      data: {
        clientDocketNo,
        isDirectBooking: true,
        consignmentType: consignmentType || null,
        requestedBy: requestedBy || null,
        consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
        consignorCity, consignorState, consignorContactPerson,
        consignorCountryCode: consignorCountryCode || '+91',
        consignorPhone, consignorEmail,
        consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
        consigneeCity, consigneeState, consigneeContactPerson,
        consigneeCountryCode: consigneeCountryCode || '+91',
        consigneePhone, consigneeEmail,
        serviceType,
        appointmentDelivery: !!appointmentDelivery,
        carrierRisk: !!carrierRisk,
        ownersRisk: !!ownersRisk,
        mallDelivery: !!mallDelivery,
        actualWeight: actualWeight ? parseFloat(actualWeight) : null,
        paymentType: paymentType || 'PREPAID',
        codPayeeName: paymentType === 'COD' ? codPayeeName : null,
        codAmount: codAmount ? parseFloat(codAmount) : null,
        invoiceValue: invoiceValue ? parseFloat(invoiceValue) : null,
        invoiceNo: invoiceNo || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        ewayBillNo: ewayBillNo || null,
        hsnCode: hsnCode || null,
        quantity: quantity ? parseInt(quantity) : null,
        promoCode: promoCode || null,
        notes: notes || null,
        status: 'PENDING',
      },
    });

    // Create package item rows if provided
    if (Array.isArray(items) && items.length > 0) {
      await prisma.orderItem.createMany({
        data: items
          .filter(r => r.description || r.packages)
          .map(r => ({
            orderId: order.id,
            description: r.description || null,
            reference: r.reference || null,
            packages: r.packages ? parseInt(r.packages) : null,
            packagesType: r.packagesType || 'BAGS',
            unitWeight: r.unitWeight ? parseFloat(r.unitWeight) : null,
            dimensionL: r.dimensionL ? parseFloat(r.dimensionL) : null,
            dimensionW: r.dimensionW ? parseFloat(r.dimensionW) : null,
            dimensionH: r.dimensionH ? parseFloat(r.dimensionH) : null,
            dimensionUnit: r.dimensionUnit || 'CMS',
          })),
      });
    }

    // Create a draft Shipment with partner info from the form
    if (primaryServiceProvider) {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          partnerName: primaryServiceProvider,
          loginId: requestedBy || null,
          docketDate: docketDate ? new Date(docketDate) : new Date(),
          pickupOption: pickupOption || null,
          billToParty: billToParty || null,
          materialHold: !!materialHold,
          waitingPermit: !!waitingPermit,
          deliveryCode: deliveryCode || null,
        },
      });
    }

    return success(res, { order }, 'Direct booking created', 201);
  } catch (e) {
    if (e.code === 'P2002') return failure(res, 'Consignment number already exists — please use a different one', 409);
    return failure(res, 'Failed to create direct booking', 500, e.message);
  }
}

async function addTrackingEvent(req, res) {
  try {
    const { status, description, location, timestamp } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { shipment: true } });
    if (!order || !order.shipment) return failure(res, 'Order/shipment not found', 404);

    const event = await prisma.trackingEvent.create({
      data: {
        shipmentId: order.shipment.id, status, description, location,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        source: 'MANUAL',
      },
    });
    return success(res, { event }, 'Tracking event added', 201);
  } catch (e) {
    return failure(res, 'Failed to add tracking event', 500, e.message);
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status, updatedAt: new Date() } });
    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { user: true, shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' }, take: 1 } } } },
      });
      if (fullOrder?.user) {
        await sendMail({
          to: fullOrder.user.email,
          subject: `Shipment Update: ${fullOrder.clientDocketNo}`,
          html: statusUpdateTemplate(fullOrder, fullOrder.shipment?.trackingEvents?.[0]),
        });
      }
    } catch (e) { console.error('Status email failed:', e.message); }
    return success(res, { order }, 'Status updated');
  } catch (e) {
    return failure(res, 'Failed to update status', 500, e.message);
  }
}

// ─── Partner Credentials ─────────────────────────────────────────────────────

async function getPartnerCredentials(req, res) {
  try {
    const creds = await prisma.partnerCredential.findMany();
    return success(res, { credentials: creds });
  } catch (e) {
    return failure(res, 'Failed to fetch credentials', 500, e.message);
  }
}

async function upsertPartnerCredential(req, res) {
  try {
    const { partner } = req.params;
    const { loginId, apiKey, apiSecret, baseUrl, extraConfig } = req.body;
    const cred = await prisma.partnerCredential.upsert({
      where: { partner },
      update: { loginId, apiKey, apiSecret, baseUrl, extraConfig },
      create: { partner, loginId, apiKey, apiSecret, baseUrl, extraConfig },
    });
    return success(res, { credential: cred }, 'Credentials saved');
  } catch (e) {
    return failure(res, 'Failed to save credentials', 500, e.message);
  }
}

// ─── Customers ───────────────────────────────────────────────────────────────

async function listCustomers(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: {
          id: true, name: true, email: true, company: true, gstin: true, phone: true, isActive: true, createdAt: true,
          _count: { select: { orders: true } },
          orders: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);
    return success(res, { customers, total });
  } catch (e) {
    return failure(res, 'Failed to fetch customers', 500, e.message);
  }
}

// ─── Invoices ────────────────────────────────────────────────────────────────

async function createInvoice(req, res) {
  try {
    const { userId, dateFrom, dateTo, lineItems, applyGST } = req.body;
    if (!userId || !dateFrom || !dateTo || !lineItems?.length) return failure(res, 'Missing required fields', 400);
    const subtotal = lineItems.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const tax = applyGST ? parseFloat((subtotal * 0.18).toFixed(2)) : 0;
    const totalAmount = parseFloat((subtotal + tax).toFixed(2));
    const invoiceNo = await generateInvoiceNo();
    const invoice = await prisma.invoice.create({
      data: { invoiceNo, userId, dateFrom: new Date(dateFrom), dateTo: new Date(dateTo), lineItems, subtotal, tax, totalAmount, status: 'DRAFT' },
    });
    return success(res, { invoice }, 'Invoice created', 201);
  } catch (e) {
    return failure(res, 'Failed to create invoice', 500, e.message);
  }
}

async function listAdminInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { user: { select: { name: true, email: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, { invoices });
  } catch (e) {
    return failure(res, 'Failed to fetch invoices', 500, e.message);
  }
}

async function sendInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!invoice) return failure(res, 'Invoice not found', 404);
    const pdfUrl = await generateInvoicePDF(invoice, invoice.user);
    await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfUrl, status: 'SENT', sentAt: new Date() } });
    const attachments = [{ filename: `${invoice.invoiceNo}.pdf`, path: path.join(__dirname, '../../', pdfUrl) }];
    await sendMail({ to: invoice.user.email, subject: `Invoice ${invoice.invoiceNo} from ShipEase`, html: invoiceTemplate(invoice, invoice.user), attachments });
    return success(res, { pdfUrl }, 'Invoice sent successfully');
  } catch (e) {
    return failure(res, 'Failed to send invoice', 500, e.message);
  }
}

// ─── MIS ─────────────────────────────────────────────────────────────────────

async function listMISReports(req, res) {
  try {
    const reports = await prisma.mISReport.findMany({ orderBy: { createdAt: 'desc' } });
    return success(res, { reports });
  } catch (e) {
    return failure(res, 'Failed to fetch MIS reports', 500, e.message);
  }
}

async function generateMIS(req, res) {
  try {
    const { dateFrom, dateTo } = req.body;
    if (!dateFrom || !dateTo) return failure(res, 'dateFrom and dateTo required', 400);
    const report = await generateMISReport(dateFrom, dateTo);
    return success(res, { report }, 'MIS report generated', 201);
  } catch (e) {
    return failure(res, 'Failed to generate MIS', 500, e.message);
  }
}

async function downloadMIS(req, res) {
  try {
    const report = await prisma.mISReport.findUnique({ where: { id: req.params.id } });
    if (!report || !report.pdfUrl) return failure(res, 'Report not found', 404);
    const filepath = path.join(__dirname, '../../', report.pdfUrl);
    if (!fs.existsSync(filepath)) return failure(res, 'PDF file not found', 404);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MIS-${report.id}.pdf"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    return failure(res, 'Download failed', 500, e.message);
  }
}

// ─── Admin Users ─────────────────────────────────────────────────────────────

async function listAdmins(req, res) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      include: { adminRole: true }, orderBy: { createdAt: 'asc' },
    });
    return success(res, { admins: admins.map(({ password: _, ...a }) => a) });
  } catch (e) {
    return failure(res, 'Failed to fetch admins', 500, e.message);
  }
}

async function createAdmin(req, res) {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) return failure(res, 'Name, email, password required', 400);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return failure(res, 'Email already exists', 409);
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role: 'ADMIN', company: 'ShipEase' } });
    const role = await prisma.adminRole.create({ data: { userId: user.id, permissions: permissions || [] } });
    const { password: _, ...userOut } = user;
    return success(res, { user: { ...userOut, adminRole: role } }, 'Admin created', 201);
  } catch (e) {
    return failure(res, 'Failed to create admin', 500, e.message);
  }
}

async function updateAdmin(req, res) {
  try {
    const { permissions, isActive } = req.body;
    if (permissions !== undefined) {
      await prisma.adminRole.upsert({
        where: { userId: req.params.id },
        update: { permissions },
        create: { userId: req.params.id, permissions },
      });
    }
    if (isActive !== undefined) await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
    return success(res, {}, 'Admin updated');
  } catch (e) {
    return failure(res, 'Failed to update admin', 500, e.message);
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

async function getDashboardStats(req, res) {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalToday, pending, inTransit, deliveredToday, totalCustomers, ordersByPartner] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.order.count({ where: { status: 'DELIVERED', updatedAt: { gte: today, lt: tomorrow } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } }),
      prisma.shipment.groupBy({ by: ['partnerName'], _count: { id: true } }),
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 10, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, company: true } },
        shipment: { select: { partnerName: true } },
      },
    });

    return success(res, {
      totalToday, pending, inTransit, deliveredToday, totalCustomers,
      ordersByPartner: ordersByPartner.map(r => ({ partner: r.partnerName, count: r._count.id })),
      recentOrders,
    });
  } catch (e) {
    return failure(res, 'Failed to fetch stats', 500, e.message);
  }
}

module.exports = {
  listAllOrders, getAdminOrder, checkRates, assignAndBook, createDirectBooking,
  addTrackingEvent, updateOrderStatus,
  getPartnerCredentials, upsertPartnerCredential,
  listCustomers,
  createInvoice, listAdminInvoices, sendInvoice,
  listMISReports, generateMIS, downloadMIS,
  listAdmins, createAdmin, updateAdmin, getDashboardStats,
};
