const { PrismaClient } = require('@prisma/client');
const { generateDocketNo, success, failure } = require('../utils/helpers');
const { sendMail, orderConfirmationTemplate } = require('../services/email.service');

const prisma = new PrismaClient();

async function createOrder(req, res) {
  try {
    const {
      pickupAddress, deliveryAddress, commodity, weight, dimensions,
      declaredValue, serviceType, paymentType, specialInstructions,
    } = req.body;

    if (!pickupAddress || !deliveryAddress || !commodity || !weight || !serviceType || !paymentType) {
      return failure(res, 'Missing required fields', 400);
    }

    const clientDocketNo = await generateDocketNo();
    const order = await prisma.order.create({
      data: {
        clientDocketNo,
        userId: req.user.id,
        pickupAddressSnapshot: pickupAddress,
        deliveryAddressSnapshot: deliveryAddress,
        commodity,
        weight: parseFloat(weight),
        dimensions: dimensions || {},
        declaredValue: parseFloat(declaredValue || 0),
        serviceType,
        paymentType,
        specialInstructions,
        status: 'PENDING',
      },
    });

    // Send confirmation email
    try {
      await sendMail({
        to: req.user.email,
        subject: `Order Booked: ${clientDocketNo}`,
        html: orderConfirmationTemplate(order),
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

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
        where,
        include: { shipment: { select: { partnerName: true, partnerDocketNo: true } } },
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

async function getOrder(req, res) {
  try {
    const order = await prisma.order.findFirst({
      where: { clientDocketNo: req.params.docketNo, userId: req.user.id },
      include: {
        shipment: {
          include: {
            trackingEvents: { orderBy: { timestamp: 'desc' } },
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

async function listInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, { invoices });
  } catch (e) {
    return failure(res, 'Failed to fetch invoices', 500, e.message);
  }
}

async function downloadInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
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
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    return success(res, { addresses });
  } catch (e) {
    return failure(res, 'Failed to fetch addresses', 500, e.message);
  }
}

async function createAddress(req, res) {
  try {
    const { label, contactName, phone, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const addr = await prisma.address.create({
      data: { userId: req.user.id, label, contactName, phone, addressLine1, addressLine2, city, state, pincode, isDefault: !!isDefault },
    });
    return success(res, { address: addr }, 'Address saved', 201);
  } catch (e) {
    return failure(res, 'Failed to save address', 500, e.message);
  }
}

module.exports = { createOrder, listOrders, getOrder, listInvoices, downloadInvoice, listAddresses, createAddress };
