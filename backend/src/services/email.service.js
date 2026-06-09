const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
    // No SMTP configured — log to console instead
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, attachments = [] }) {
  const t = getTransporter();
  if (!t) {
    console.log('\n[EMAIL LOG] ==================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body: [HTML email - configure SMTP to send real emails]');
    console.log('================================\n');
    return;
  }

  await t.sendMail({
    from: `"ShipEase Logistics" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}

function orderConfirmationTemplate(order) {
  const pickup = order.pickupAddressSnapshot;
  const delivery = order.deliveryAddressSnapshot;
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ShipEase</h1>
        <p style="color: #fca5a5; margin: 4px 0 0;">Logistics Made Simple</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #18181b;">Order Confirmed!</h2>
        <p style="color: #52525b;">Your shipment has been booked successfully.</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">Docket Number</p>
          <p style="margin: 0; font-size: 22px; font-weight: 700; color: #dc2626; letter-spacing: 2px;">${order.clientDocketNo}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; font-size: 14px;">Commodity</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-weight: 600;">${order.commodity}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; font-size: 14px;">Service Type</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-weight: 600;">${order.serviceType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; font-size: 14px;">From</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">${pickup.city}, ${pickup.state}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">To</td>
            <td style="padding: 8px 0;">${delivery.city}, ${delivery.state}</td>
          </tr>
        </table>
        <a href="${process.env.FRONTEND_URL}/orders/${order.clientDocketNo}"
           style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Track Shipment
        </a>
      </div>
      <div style="background: #f4f4f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #71717a;">
        ShipEase Logistics Pvt. Ltd. | support@shipease.in
      </div>
    </div>`;
}

function statusUpdateTemplate(order, latestEvent) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0;">ShipEase</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #18181b;">Shipment Update</h2>
        <p style="color: #52525b;">Your shipment <strong>${order.clientDocketNo}</strong> has a status update.</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 4px; font-size: 14px; color: #71717a;">Current Status</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">${order.status.replace(/_/g, ' ')}</p>
          ${latestEvent ? `<p style="margin: 8px 0 0; color: #52525b;">${latestEvent.description} — ${latestEvent.location}</p>` : ''}
        </div>
        <a href="${process.env.FRONTEND_URL}/orders/${order.clientDocketNo}"
           style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View Tracking
        </a>
      </div>
      <div style="background: #f4f4f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #71717a;">
        ShipEase Logistics Pvt. Ltd. | support@shipease.in
      </div>
    </div>`;
}

function invoiceTemplate(invoice, customer) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0;">ShipEase</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #18181b;">Invoice ${invoice.invoiceNo}</h2>
        <p>Dear ${customer.name},</p>
        <p style="color: #52525b;">Please find your invoice attached. Total amount due: <strong>₹${invoice.totalAmount.toLocaleString('en-IN')}</strong></p>
        <p style="color: #71717a; font-size: 14px;">Invoice Period: ${new Date(invoice.dateFrom).toLocaleDateString('en-IN')} — ${new Date(invoice.dateTo).toLocaleDateString('en-IN')}</p>
      </div>
      <div style="background: #f4f4f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #71717a;">
        ShipEase Logistics Pvt. Ltd. | billing@shipease.in
      </div>
    </div>`;
}

function dailyMISTemplate(date, reportSummary) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0;">ShipEase MIS Report</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2>Daily MIS — ${date}</h2>
        <p style="color: #52525b;">Please find the daily MIS report attached.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f4f4f5;">
            <th style="padding: 10px; text-align: left; font-size: 14px;">Metric</th>
            <th style="padding: 10px; text-align: right; font-size: 14px;">Value</th>
          </tr>
          <tr><td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7;">Total Bookings</td><td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e4e4e7;">${reportSummary.totalOrders}</td></tr>
          <tr><td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7;">Delivered</td><td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e4e4e7;">${reportSummary.delivered}</td></tr>
          <tr><td style="padding: 8px 10px;">New Customers</td><td style="padding: 8px 10px; text-align: right;">${reportSummary.newCustomers}</td></tr>
        </table>
      </div>
      <div style="background: #f4f4f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #71717a;">
        ShipEase Logistics Pvt. Ltd. | mis@shipease.in
      </div>
    </div>`;
}

module.exports = {
  sendMail,
  orderConfirmationTemplate,
  statusUpdateTemplate,
  invoiceTemplate,
  dailyMISTemplate,
};
