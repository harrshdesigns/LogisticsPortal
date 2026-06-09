const { PrismaClient } = require('@prisma/client');
const { generateMISPDF } = require('./pdf.service');
const { sendMail, dailyMISTemplate } = require('./email.service');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateMISReport(dateFrom, dateTo) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { shipment: true },
  });

  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const inTransit = orders.filter(o => o.status === 'IN_TRANSIT').length;
  const pending = orders.filter(o => o.status === 'PENDING').length;
  const exceptions = orders.filter(o => o.status === 'EXCEPTION').length;

  const newCustomers = await prisma.user.count({
    where: { role: 'CUSTOMER', createdAt: { gte: from, lte: to } },
  });

  const partnerMap = {};
  for (const order of orders) {
    if (!order.shipment) continue;
    const p = order.shipment.partnerName;
    if (!partnerMap[p]) partnerMap[p] = { partner: p, total: 0, delivered: 0, inTransit: 0 };
    partnerMap[p].total++;
    if (order.status === 'DELIVERED') partnerMap[p].delivered++;
    if (order.status === 'IN_TRANSIT') partnerMap[p].inTransit++;
  }

  const data = {
    totalOrders, delivered, inTransit, pending, exceptions, newCustomers,
    partnerBreakdown: Object.values(partnerMap),
  };

  const misRecord = await prisma.mISReport.create({
    data: { reportDate: from },
  });

  const pdfUrl = await generateMISPDF(misRecord, dateFrom, dateTo, data);

  await prisma.mISReport.update({
    where: { id: misRecord.id },
    data: { pdfUrl },
  });

  // Send to all super admins
  const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true } });
  const dateStr = from.toLocaleDateString('en-IN');
  const html = dailyMISTemplate(dateStr, data);
  const attachments = pdfUrl ? [{
    filename: path.basename(pdfUrl),
    path: path.join(__dirname, '../../', pdfUrl),
  }] : [];

  for (const admin of superAdmins) {
    await sendMail({
      to: admin.email,
      subject: `Daily MIS Report — ${dateStr}`,
      html,
      attachments,
    });
  }

  return { ...misRecord, pdfUrl };
}

module.exports = { generateMISReport };
