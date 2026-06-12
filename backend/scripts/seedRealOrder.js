/**
 * Seeds one real DP World order (docket 1800856318) into the database.
 * Fetches live tracking events from DP World, creates Order + Shipment + TrackingEvents.
 *
 * Usage: cd backend && node scripts/seedRealOrder.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'https://expresstms.dpworld.com/integration';
const API_KEY = process.env.DP_WORLD_API_KEY;
const PARTNER_DOCKET = '1800856318';

const DP_STATUS_MAP = {
  CREATED: 'BOOKED',
  GENERAL: 'IN_TRANSIT',
  INVOICE_UPDATED: 'IN_TRANSIT',
  SERVICE_LANE_CHANGE: 'IN_TRANSIT',
  DISPATCHED: 'IN_TRANSIT',
  REACHED_AT_PICKUP_BRANCH: 'AT_HUB',
  UNLOADED: 'AT_HUB',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  EXCEPTION: 'EXCEPTION',
  RTO: 'EXCEPTION',
};

function dpwHeader() {
  return { 'X-ShipX-API-Key': API_KEY, 'Content-Type': 'application/json' };
}

async function main() {
  // Prevent duplicate seed
  const existing = await prisma.shipment.findFirst({
    where: { partnerDocketNo: PARTNER_DOCKET },
  });
  if (existing) {
    console.log(`Order with partnerDocketNo ${PARTNER_DOCKET} already exists (shipment ${existing.id}). Skipping.`);
    return;
  }

  console.log(`Fetching DP World data for docket ${PARTNER_DOCKET}...`);

  const trackResp = await axios.post(
    `${BASE_URL}/consignments/track.json`,
    { lr: { number: PARTNER_DOCKET } },
    { headers: dpwHeader(), timeout: 20000 },
  );
  const lr = trackResp.data?.lr;
  if (!lr?.id) throw new Error(`Track response had no lr.id: ${JSON.stringify(trackResp.data)}`);
  console.log(`Track summary — state: ${lr.state}, consignee: ${lr.consignee_company_name}, ${lr.consignee_city}`);

  const detailResp = await axios.get(
    `${BASE_URL}/consignments/${lr.id}/detail.json`,
    { headers: dpwHeader(), timeout: 20000 },
  );
  const detail = detailResp.data?.lr;
  const events = detail?.events || [];
  console.log(`Detail fetched — ${events.length} events`);

  // Generate client docket number using the same counter as the app
  const counter = await prisma.counter.update({
    where: { id: 'order' },
    data: { value: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  const clientDocketNo = `CLT-${year}-${String(counter.value).padStart(5, '0')}`;
  console.log(`Generated client docket: ${clientDocketNo}`);

  // Parse invoice details from detail response
  const invoiceData = detail?.invoices?.[0] || detail?.consignment_invoices?.consignment_invoice?.[0] || {};
  const invoiceNo = invoiceData.invoice_number || detail?.invoice_number || null;
  const invoiceValue = invoiceData.invoice_value ? parseFloat(invoiceData.invoice_value) : null;
  const invoiceDate = invoiceData.invoice_date ? new Date(invoiceData.invoice_date) : null;
  const ewayBillNo = invoiceData.eway_bill_number || null;
  const hsnCode = invoiceData.HSN_code || null;

  // Parse weight from detail
  const actualWeight = detail?.weight ? parseFloat(detail.weight) : 15;

  // Parse dispatch date
  let docketDate = new Date('2026-06-11T20:57:00+05:30');
  if (lr.dispatch_date) {
    const parsed = new Date(lr.dispatch_date);
    if (!isNaN(parsed)) docketDate = parsed;
  }

  // Create Order
  const order = await prisma.order.create({
    data: {
      clientDocketNo,
      isDirectBooking: true,
      consignmentType: 'OUTBOUND',
      consignorName: lr.consignor_company_name || 'S K ENTERPRISES',
      consignorCity: lr.consignor_city || 'Palghar',
      consignorState: lr.consignor_state || 'Maharashtra',
      consignorPin: detail?.consignor_pin || lr.consignor_pin || '401404',
      consignorAddressLine1: detail?.consignor_address_line1 || '',
      consigneeName: lr.consignee_company_name || 'RELIANCE BRANDS LIMITED',
      consigneeCity: lr.consignee_city || 'Coimbatore',
      consigneeState: lr.consignee_state || 'Tamil Nadu',
      consigneePin: lr.consignee_pin || '641001',
      consigneeAddressLine1: detail?.consignee_address_line1 || '',
      serviceType: 'SURFACE',
      paymentType: 'PREPAID',
      actualWeight,
      packages: 4,
      packagesType: 'BOXES',
      invoiceNo: invoiceNo || 'PP/26-27/205',
      invoiceValue,
      invoiceDate,
      ewayBillNo,
      hsnCode,
      status: 'IN_TRANSIT',
    },
  });
  console.log(`Created order: ${order.id} (${clientDocketNo})`);

  // Create Shipment (partnerDocketNo is admin-only — never exposed to customer)
  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      partnerName: 'DP_WORLD',
      partnerDocketNo: PARTNER_DOCKET,
      docketDate,
      bookedAt: docketDate,
    },
  });
  console.log(`Created shipment: ${shipment.id}`);

  // Seed all tracking events
  let seeded = 0;
  for (const ev of events) {
    const status = DP_STATUS_MAP[ev.event_type] || ev.event_type || 'IN_TRANSIT';
    const timestamp = ev.occurred_at || ev.recorded_at;
    if (!timestamp) continue;
    await prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status,
        description: ev.description || ev.event_type || '',
        location: ev.event_location_display_name || '',
        timestamp: new Date(timestamp),
        source: 'API',
      },
    });
    seeded++;
  }
  console.log(`Seeded ${seeded} tracking events`);
  console.log(`\nDone! Track this order in the app with: ${clientDocketNo}`);
  console.log(`Admin can see it at: /admin/orders/<order-id>`);
}

main()
  .catch(e => { console.error('Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
