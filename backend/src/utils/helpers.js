const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateDocketNo() {
  const counter = await prisma.counter.update({
    where: { id: 'order' },
    data: { value: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `CLT-${year}-${String(counter.value).padStart(5, '0')}`;
}

async function generateInvoiceNo() {
  const counter = await prisma.counter.update({
    where: { id: 'invoice' },
    data: { value: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(counter.value).padStart(5, '0')}`;
}

function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message, error: '' });
}

function failure(res, message = 'Error', statusCode = 400, error = '') {
  return res.status(statusCode).json({ success: false, data: null, message, error: error || message });
}

module.exports = { generateDocketNo, generateInvoiceNo, success, failure };
