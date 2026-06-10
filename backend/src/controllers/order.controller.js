const { PrismaClient } = require('@prisma/client');
const { generateDocketNo, success, failure } = require('../utils/helpers');
const { sendMail, orderConfirmationTemplate } = require('../services/email.service');

const prisma = new PrismaClient();

async function createOrder(req, res) {
  try {
    const {
      consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
      consignorCity, consignorState, consignorContactPerson, consignorPhone, consignorEmail,
      consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
      consigneeCity, consigneeState, consigneeContactPerson, consigneePhone, consigneeEmail,
      serviceType, appointmentDelivery, carrierRisk, ownersRisk, mallDelivery,
      actualWeight, itemDescription, packages, packagesType, unitWeight,
      dimensionL, dimensionW, dimensionH, dimensionUnit,
      paymentType, codPayeeName, notes,
    } = req.body;

    if (!consignorName || !consigneeName || !serviceType || !paymentType) {
      return failure(res, 'Missing required fields', 400);
    }

    const clientDocketNo = await generateDocketNo();

    const order = await prisma.order.create({
      data: {
        clientDocketNo,
        userId: req.user.id,
        consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
        consignorCity, consignorState, consignorContactPerson, consignorPhone, consignorEmail,
        consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
        consigneeCity, consigneeState, consigneeContactPerson, consigneePhone, consigneeEmail,
        serviceType,
        appointmentDelivery: !!appointmentDelivery,
        carrierRisk: !!carrierRisk,
        ownersRisk: !!ownersRisk,
        mallDelivery: !!mallDelivery,
        actualWeight: actualWeight ? parseFloat(actualWeight) : null,
        itemDescription,
        packages: packages ? parseInt(packages) : null,
        packagesType: packagesType || 'BAGS',
        unitWeight: unitWeight ? parseFloat(unitWeight) : null,
        dimensionL: dimensionL ? parseFloat(dimensionL) : null,
        dimensionW: dimensionW ? parseFloat(dimensionW) : null,
        dimensionH: dimensionH ? parseFloat(dimensionH) : null,
        dimensionUnit: dimensionUnit || 'CMS',
        paymentType,
        codPayeeName: paymentType === 'COD' ? codPayeeName : null,
        notes,
        status: 'PENDING',
      },
    });

    try {
      await sendMail({
        to: req.user.email,
        subject: `Order Booked: ${clientDocketNo}`,
        html: orderConfirmationTemplate({ ...order, pickupAddressSnapshot: { city: consignorCity, state: consignorState }, deliveryAddressSnapshot: { city: consigneeCity, state: consigneeState } }),
      });
    } catch (e) { console.error('Email send failed:', e.message); }

    return success(res, { order }, 'Order created successfully', 201);
  } catch (e) {
    return failure(res, 'Failed to create order', 500, e.message);
  }
}

async function listOrders(req, res) {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (search) where.clientDocketNo = { contains: search, mode: 'insensitive' };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit),
        include: { shipment: { select: { partnerName: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return success(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    return failure(res, 'Failed to fetch orders', 500, e.message);
  }
}

async function getOrder(req, res) {
  try {
    const order = await prisma.order.findFirst({
      where: { clientDocketNo: req.params.docketNo, userId: req.user.id },
      include: { shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } } },
    });
    if (!order) return failure(res, 'Order not found', 404);
    return success(res, { order });
  } catch (e) {
    return failure(res, 'Failed to fetch order', 500, e.message);
  }
}

// Public tracking — no auth required
async function trackOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { clientDocketNo: req.params.docketNo },
      include: { shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } } },
    });
    if (!order) return failure(res, 'Docket number not found', 404);

    // Strip partner details before returning
    const { shipment, ...orderData } = order;
    return success(res, {
      order: {
        ...orderData,
        trackingEvents: shipment?.trackingEvents || [],
      }
    });
  } catch (e) {
    return failure(res, 'Failed to track order', 500, e.message);
  }
}

async function listInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id }, orderBy: { createdAt: 'desc' },
    });
    return success(res, { invoices });
  } catch (e) {
    return failure(res, 'Failed to fetch invoices', 500, e.message);
  }
}

async function downloadInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!invoice) return failure(res, 'Invoice not found', 404);
    if (!invoice.pdfUrl) return failure(res, 'PDF not generated yet', 404);
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(__dirname, '../../', invoice.pdfUrl);
    if (!fs.existsSync(filepath)) return failure(res, 'PDF file not found', 404);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo}.pdf"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    return failure(res, 'Download failed', 500, e.message);
  }
}

async function listAddresses(req, res) {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id }, orderBy: { isDefault: 'desc' },
    });
    return success(res, { addresses });
  } catch (e) {
    return failure(res, 'Failed to fetch addresses', 500, e.message);
  }
}

async function createAddress(req, res) {
  try {
    const { label, companyName, contactName, phone, email, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const addr = await prisma.address.create({
      data: { userId: req.user.id, label, companyName, contactName, phone, email, addressLine1, addressLine2, city, state, pincode, isDefault: !!isDefault },
    });
    return success(res, { address: addr }, 'Address saved', 201);
  } catch (e) {
    return failure(res, 'Failed to save address', 500, e.message);
  }
}

module.exports = { createOrder, listOrders, getOrder, trackOrder, listInvoices, downloadInvoice, listAddresses, createAddress };
