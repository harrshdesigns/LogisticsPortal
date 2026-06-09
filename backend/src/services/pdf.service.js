const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const PDF_DIR = path.join(__dirname, '../../storage/pdfs');

function ensureDir() {
  if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
}

function header(doc, title) {
  doc.rect(0, 0, doc.page.width, 80).fill('#dc2626');
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('ShipEase', 40, 20);
  doc.fillColor('#fca5a5').fontSize(11).font('Helvetica').text('Logistics Made Simple', 40, 46);
  doc.fillColor('#52525b').fontSize(16).font('Helvetica-Bold').text(title, 40, 100);
  doc.moveDown(0.5);
}

function tableRow(doc, cols, y, options = {}) {
  const { bg = null, bold = false } = options;
  if (bg) {
    doc.rect(40, y, doc.page.width - 80, 20).fill(bg).fillColor('#18181b');
  }
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  doc.font(font).fontSize(10).fillColor('#18181b');
  let x = 40;
  cols.forEach(({ text, width, align = 'left' }) => {
    doc.text(text, x + 4, y + 4, { width: width - 8, align });
    x += width;
  });
}

async function generateInvoicePDF(invoice, customer) {
  ensureDir();
  const filename = `${invoice.invoiceNo}.pdf`;
  const filepath = path.join(PDF_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    header(doc, 'INVOICE');

    // Invoice meta
    doc.y = 130;
    doc.font('Helvetica').fontSize(11).fillColor('#52525b');
    doc.text(`Invoice No: `, { continued: true }).font('Helvetica-Bold').fillColor('#18181b').text(invoice.invoiceNo);
    doc.font('Helvetica').fillColor('#52525b').text(`Date: `, { continued: true }).font('Helvetica-Bold').fillColor('#18181b').text(new Date(invoice.createdAt).toLocaleDateString('en-IN'));
    doc.font('Helvetica').fillColor('#52525b').text(`Period: `, { continued: true }).font('Helvetica-Bold').fillColor('#18181b').text(`${new Date(invoice.dateFrom).toLocaleDateString('en-IN')} — ${new Date(invoice.dateTo).toLocaleDateString('en-IN')}`);

    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#18181b').text('Billed To:');
    doc.font('Helvetica').fontSize(11).fillColor('#52525b');
    doc.text(customer.company || customer.name);
    doc.text(`GSTIN: ${customer.gstin || 'N/A'}`);
    doc.text(customer.email);
    doc.text(customer.phone || '');

    doc.moveDown(1.5);

    // Table header
    const colWidths = [100, 80, 100, 60, 80, 100];
    const colNames = ['Docket No', 'Date', 'Commodity', 'Weight', 'Service', 'Amount (₹)'];
    let tableY = doc.y;

    doc.rect(40, tableY, doc.page.width - 80, 22).fill('#dc2626');
    let x = 40;
    colNames.forEach((name, i) => {
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(name, x + 4, tableY + 5, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });

    tableY += 22;
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    lineItems.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#f4f4f5' : '#ffffff';
      doc.rect(40, tableY, doc.page.width - 80, 20).fill(bg);
      const cols = [
        { text: item.docketNo || '', width: 100 },
        { text: item.date ? new Date(item.date).toLocaleDateString('en-IN') : '', width: 80 },
        { text: item.commodity || '', width: 100 },
        { text: `${item.weight} kg`, width: 60 },
        { text: item.serviceType || '', width: 80 },
        { text: `₹${Number(item.amount || 0).toLocaleString('en-IN')}`, width: 100, align: 'right' },
      ];
      tableRow(doc, cols, tableY);
      tableY += 20;
    });

    doc.y = tableY + 16;
    doc.font('Helvetica').fontSize(11).fillColor('#52525b');
    doc.text(`Subtotal: ₹${invoice.subtotal.toLocaleString('en-IN')}`, { align: 'right' });
    doc.text(`GST (18%): ₹${invoice.tax.toLocaleString('en-IN')}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#dc2626').text(`Total: ₹${invoice.totalAmount.toLocaleString('en-IN')}`, { align: 'right' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).fillColor('#71717a')
      .text('Payment Terms: Net 30 days. Bank transfer to ShipEase Logistics Pvt. Ltd.', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/storage/pdfs/${filename}`));
    stream.on('error', reject);
  });
}

async function generateMISPDF(report, dateFrom, dateTo, data) {
  ensureDir();
  const filename = `MIS-${new Date(dateFrom).toISOString().slice(0, 10)}.pdf`;
  const filepath = path.join(PDF_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    header(doc, 'MIS REPORT');

    doc.y = 130;
    doc.font('Helvetica').fontSize(11).fillColor('#52525b')
      .text(`Report Period: ${new Date(dateFrom).toLocaleDateString('en-IN')} — ${new Date(dateTo).toLocaleDateString('en-IN')}`);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown(1.5);

    // Summary
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#18181b').text('Summary');
    doc.moveDown(0.5);

    const summaryRows = [
      ['Total Orders', String(data.totalOrders)],
      ['Delivered', String(data.delivered)],
      ['In Transit', String(data.inTransit)],
      ['Pending', String(data.pending)],
      ['Exceptions', String(data.exceptions)],
      ['New Customers', String(data.newCustomers)],
    ];

    let y = doc.y;
    summaryRows.forEach(([label, val], i) => {
      const bg = i % 2 === 0 ? '#f4f4f5' : '#ffffff';
      doc.rect(40, y, doc.page.width - 80, 20).fill(bg);
      doc.font('Helvetica').fontSize(11).fillColor('#52525b').text(label, 44, y + 4);
      doc.font('Helvetica-Bold').fillColor('#18181b').text(val, doc.page.width - 120, y + 4, { width: 60, align: 'right' });
      y += 20;
    });

    doc.y = y + 20;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#18181b').text('Partner-wise Breakdown');
    doc.moveDown(0.5);

    y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 22).fill('#dc2626');
    ['Partner', 'Bookings', 'Delivered', 'In Transit'].forEach((h, i) => {
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(h, 40 + i * 120 + 4, y + 5, { width: 116 });
    });
    y += 22;

    (data.partnerBreakdown || []).forEach((row, i) => {
      const bg = i % 2 === 0 ? '#f4f4f5' : '#ffffff';
      doc.rect(40, y, doc.page.width - 80, 20).fill(bg);
      [row.partner, String(row.total), String(row.delivered), String(row.inTransit)].forEach((val, j) => {
        doc.font('Helvetica').fontSize(10).fillColor('#18181b').text(val, 40 + j * 120 + 4, y + 4, { width: 116 });
      });
      y += 20;
    });

    doc.end();
    stream.on('finish', () => resolve(`/storage/pdfs/${filename}`));
    stream.on('error', reject);
  });
}

module.exports = { generateInvoicePDF, generateMISPDF, PDF_DIR };
