const { PrismaClient } = require('@prisma/client');
const { generateDocketNo, success, failure } = require('../utils/helpers');
const { sendMail, orderConfirmationTemplate } = require('../services/email.service');
const { getAdapter } = require('../services/deliveryPartners');

const prisma = new PrismaClient();

// Descriptions that contain internal partner/charge info — never shown to customers.
const INTERNAL_EVENT_PATTERN = /charge|invoice updated|label.{0,15}print/i;

function customerVisibleEvents(events = [], partnerDocketNo = null) {
  return events
    .filter(ev => !INTERNAL_EVENT_PATTERN.test(ev.description))
    .map(ev => {
      if (!partnerDocketNo) return ev;
      // Strip LR/partner docket number from description text
      const cleaned = ev.description
        .replace(new RegExp(`\\b${partnerDocketNo}\\b`, 'g'), 'your shipment')
        .replace(/\bLR\b\s*/gi, '')
        .trim();
      return { ...ev, description: cleaned || ev.description };
    });
}

async function createOrder(req, res) {
  try {
    const {
      consignorName, consignorPin, consignorAddressLine1, consignorAddressLine2,
      consignorCity, consignorState, consignorContactPerson,
      consignorCountryCode, consignorPhone, consignorEmail,
      consigneeName, consigneePin, consigneeAddressLine1, consigneeAddressLine2,
      consigneeCity, consigneeState, consigneeContactPerson,
      consigneeCountryCode, consigneePhone, consigneeEmail,
      serviceType, appointmentDelivery, carrierRisk, ownersRisk, mallDelivery,
      actualWeight, itemDescription, packages, packagesType, unitWeight,
      dimensionL, dimensionW, dimensionH, dimensionUnit,
      paymentType, codPayeeName, codAmount, notes,
      invoiceValue, invoiceNo, invoiceDate, ewayBillNo, hsnCode, quantity,
      billToParty, docketDate, materialHold, waitingPermit,
      items,
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
        codAmount: codAmount ? parseFloat(codAmount) : null,
        invoiceValue: invoiceValue ? parseFloat(invoiceValue) : null,
        invoiceNo: invoiceNo || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        ewayBillNo: ewayBillNo || null,
        hsnCode: hsnCode || null,
        quantity: quantity ? parseInt(quantity) : null,
        billToParty: billToParty || null,
        docketDate: docketDate ? new Date(docketDate) : null,
        materialHold: !!materialHold,
        waitingPermit: !!waitingPermit,
        notes,
        status: 'PENDING',
      },
    });

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
    // Strip partner docket and filter internal events before returning to customer
    const { shipment, ...orderData } = order;
    return success(res, {
      order: {
        ...orderData,
        shipment: shipment ? {
          bookedAt: shipment.bookedAt,
          trackingEvents: customerVisibleEvents(shipment.trackingEvents, shipment.partnerDocketNo),
        } : null,
      },
    });
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

    // Strip all partner details and filter internal events before returning
    const { shipment, ...orderData } = order;
    return success(res, {
      order: {
        ...orderData,
        trackingEvents: customerVisibleEvents(shipment?.trackingEvents || [], shipment?.partnerDocketNo),
      },
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
    const { label, companyName, contactName, countryCode, phone, email, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const addr = await prisma.address.create({
      data: { userId: req.user.id, label, companyName, contactName, countryCode: countryCode || '+91', phone, email, addressLine1, addressLine2, city, state, pincode, isDefault: !!isDefault },
    });
    return success(res, { address: addr }, 'Address saved', 201);
  } catch (e) {
    return failure(res, 'Failed to save address', 500, e.message);
  }
}

async function syncTrackingCustomer(req, res) {
  try {
    const order = await prisma.order.findFirst({
      where: { clientDocketNo: req.params.docketNo, userId: req.user.id },
      include: { shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } } },
    });
    if (!order) return failure(res, 'Order not found', 404);
    if (!order.shipment?.partnerDocketNo) return failure(res, 'No partner shipment to sync', 400);
    if (order.shipment.partnerName === 'MANUAL') return failure(res, 'Manual shipments cannot be synced', 400);

    const cred = await prisma.partnerCredential.findUnique({ where: { partner: order.shipment.partnerName } });
    const adapter = getAdapter(order.shipment.partnerName);

    const result = await adapter.trackShipment(order.shipment.partnerDocketNo, {
      apiKey: cred?.apiKey,
      extraConfig: cred?.extraConfig,
    });

    let added = 0;
    for (const ev of result.events) {
      const ts = new Date(ev.timestamp);
      const exists = order.shipment.trackingEvents.some(
        e => e.status === ev.status && Math.abs(new Date(e.timestamp) - ts) < 60000
      );
      if (!exists) {
        await prisma.trackingEvent.create({
          data: {
            shipmentId: order.shipment.id,
            status: ev.status,
            description: ev.description || '',
            location: ev.location || '',
            timestamp: ts,
            source: 'API',
          },
        });
        added++;
        if (ev.status === 'DELIVERED') {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });
        } else if (ev.status === 'OUT_FOR_DELIVERY') {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'OUT_FOR_DELIVERY' } });
        } else if (['IN_TRANSIT', 'AT_HUB'].includes(ev.status) && order.status === 'BOOKED') {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'IN_TRANSIT' } });
        }
      }
    }

    // Re-fetch and return with filtered events (customer view)
    const updated = await prisma.order.findFirst({
      where: { clientDocketNo: req.params.docketNo, userId: req.user.id },
      include: { shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } } },
    });
    const { shipment, ...orderData } = updated;
    return success(res, {
      order: {
        ...orderData,
        shipment: shipment ? {
          bookedAt: shipment.bookedAt,
          trackingEvents: customerVisibleEvents(shipment.trackingEvents, shipment.partnerDocketNo),
        } : null,
      },
      newEvents: added,
    }, `Synced — ${added} new event${added !== 1 ? 's' : ''}`);
  } catch (e) {
    return failure(res, 'Sync failed', 500, e.message);
  }
}

module.exports = { createOrder, listOrders, getOrder, trackOrder, listInvoices, downloadInvoice, listAddresses, createAddress, syncTrackingCustomer };
