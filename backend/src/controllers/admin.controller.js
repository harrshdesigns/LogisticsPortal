const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateInvoiceNo, success, failure } = require('../utils/helpers');
const { getAdapter } = require('../services/deliveryPartners');
const { generateInvoicePDF } = require('../services/pdf.service');
const { generateMISReport } = require('../services/mis.service');
const { sendMail, invoiceTemplate, statusUpdateTemplate } = require('../services/email.service');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Orders
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
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    if (partner) where.shipment = { partnerName: partner };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, company: true } },
          shipment: { select: { partnerName: true, partnerDocketNo: true, bookedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
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

async function assignAndBook(req, res) {
  try {
    const { partnerName, senderName, senderPhone, senderAddress, receiverName, receiverPhone, receiverAddress, weight, dimensions, declaredValue, serviceType, paymentType } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return failure(res, 'Order not found', 404);

    const adapter = getAdapter(partnerName);
    const result = await adapter.bookShipment({ ...order, senderName, senderPhone, receiverName, receiverPhone, weight, dimensions, declaredValue, serviceType, paymentType });

    if (!result.success) return failure(res, 'Booking failed with partner', 400, result.rawResponse);

    const shipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        partnerName,
        partnerDocketNo: result.partnerDocketNo,
        bookingResponse: result.rawResponse,
        bookedAt: new Date(),
        bookedByAdminId: req.user.id,
      },
      create: {
        orderId: order.id,
        partnerName,
        partnerDocketNo: result.partnerDocketNo,
        bookingResponse: result.rawResponse,
        bookedAt: new Date(),
        bookedByAdminId: req.user.id,
      },
    });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'BOOKED', updatedAt: new Date() } });

    // Initial tracking event
    await prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: 'BOOKED',
        description: `Shipment booked with ${partnerName}. Partner docket: ${result.partnerDocketNo}`,
        location: order.pickupAddressSnapshot?.city || 'Origin',
        timestamp: new Date(),
        source: 'API',
      },
    });

    return success(res, { shipment, partnerDocketNo: result.partnerDocketNo }, 'Shipment booked successfully');
  } catch (e) {
    return failure(res, 'Booking failed', 500, e.message);
  }
}

async function addTrackingEvent(req, res) {
  try {
    const { status, description, location, timestamp } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { shipment: true } });
    if (!order || !order.shipment) return failure(res, 'Order/shipment not found', 404);

    const event = await prisma.trackingEvent.create({
      data: {
        shipmentId: order.shipment.id,
        status,
        description,
        location,
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

    // Send status update email
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
    } catch (e) {
      console.error('Status email failed:', e.message);
    }

    return success(res, { order }, 'Status updated');
  } catch (e) {
    return failure(res, 'Failed to update status', 500, e.message);
  }
}

// Customers
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
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);
    return success(res, { customers, total });
  } catch (e) {
    return failure(res, 'Failed to fetch customers', 500, e.message);
  }
}

// Invoices
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

    const attachments = [{
      filename: `${invoice.invoiceNo}.pdf`,
      path: path.join(__dirname, '../../', pdfUrl),
    }];

    await sendMail({
      to: invoice.user.email,
      subject: `Invoice ${invoice.invoiceNo} from ShipEase`,
      html: invoiceTemplate(invoice, invoice.user),
      attachments,
    });

    return success(res, { pdfUrl }, 'Invoice sent successfully');
  } catch (e) {
    return failure(res, 'Failed to send invoice', 500, e.message);
  }
}

// MIS
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

// Admin users
async function listAdmins(req, res) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      include: { adminRole: true },
      orderBy: { createdAt: 'asc' },
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
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;

    if (permissions !== undefined) {
      await prisma.adminRole.upsert({
        where: { userId: req.params.id },
        update: { permissions },
        create: { userId: req.params.id, permissions },
      });
    }
    if (Object.keys(updates).length) {
      await prisma.user.update({ where: { id: req.params.id }, data: updates });
    }

    return success(res, {}, 'Admin updated');
  } catch (e) {
    return failure(res, 'Failed to update admin', 500, e.message);
  }
}

// Dashboard stats
async function getDashboardStats(req, res) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalToday, pending, inTransit, deliveredToday, totalCustomers, ordersByPartner] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.order.count({ where: { status: 'DELIVERED', updatedAt: { gte: today, lt: tomorrow } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } }),
      prisma.shipment.groupBy({ by: ['partnerName'], _count: { id: true } }),
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
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
  listAllOrders, getAdminOrder, assignAndBook, addTrackingEvent, updateOrderStatus,
  listCustomers, createInvoice, listAdminInvoices, sendInvoice,
  listMISReports, generateMIS, downloadMIS,
  listAdmins, createAdmin, updateAdmin, getDashboardStats,
};
