/**
 * Generates and opens a printable GCN docket in a new window.
 *
 * isAdmin=true  → DP World header, uses partnerDocketNo + liveDetail data
 * isAdmin=false → S K Enterprises header, uses clientDocketNo + order data
 */
export function printDocket(order, liveDetail = null, isAdmin = false) {
  const ld = liveDetail;
  const ldInv = ld?.consignment_invoices?.consignment_invoice?.[0];

  /* ── Core identifiers ─────────────────────────────── */
  const gcnNo = isAdmin
    ? (order.shipment?.partnerDocketNo || order.clientDocketNo)
    : order.clientDocketNo;

  const rawDate = ld?.ready_for_pickup_at || order.shipment?.docketDate || order.shipment?.bookedAt || order.createdAt;
  const docketDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  /* ── Consignor ──────────────────────────────────────── */
  const consignorName = ld?.consignor_company_name || order.consignorName || '';
  const consignorAddr = [
    ld?.consignor_address_line1 || order.consignorAddressLine1,
    ld?.consignor_address_line2 || order.consignorAddressLine2,
  ].filter(Boolean).join(', ');
  const consignorCityState = [
    ld?.consignor_city || order.consignorCity,
    ld?.consignor_state || order.consignorState,
  ].filter(Boolean).join(', ');
  const consignorPin = ld?.consignor_pin || order.consignorPin || '';
  const consignorPhone = ld?.consignor_phone || order.consignorPhone || '';

  /* ── Consignee ──────────────────────────────────────── */
  const consigneeName = ld?.consignee_company_name || order.consigneeName || '';
  const consigneeAddr = [
    ld?.consignee_address_line1 || order.consigneeAddressLine1,
    ld?.consignee_address_line2 || order.consigneeAddressLine2,
  ].filter(Boolean).join(', ');
  const consigneeCityState = [
    ld?.consignee_city || order.consigneeCity,
    ld?.consignee_state || order.consigneeState,
  ].filter(Boolean).join(', ');
  const consigneePin = ld?.consignee_pin || order.consigneePin || '';
  const consigneePhone = ld?.consignee_phone || order.consigneePhone || '';

  /* ── Route ──────────────────────────────────────────── */
  const fromCity = ld?.pickup_branch_facility_name || ld?.consignor_city || order.consignorCity || '';
  const toCity   = ld?.delivery_branch_facility_name || ld?.consignee_city || order.consigneeCity || '';

  /* ── Weight / freight ───────────────────────────────── */
  const volume        = ld?.volume         ? `${ld.volume} Cft`            : '—';
  const grossWt       = ld?.weight         ? `${ld.weight} Kgs`            : (order.actualWeight ? `${order.actualWeight} Kgs` : '—');
  const chargeableWt  = ld?.chargable_weight ? `${ld.chargable_weight} Kgs` : '—';
  const rawPayment    = ld?.payment_mode   || order.paymentType || 'PREPAID';
  const freightLabel  = rawPayment.toUpperCase() === 'PREPAID'  ? 'Prepaid'
                      : rawPayment.toUpperCase() === 'TO_PAY'   ? 'To Pay'
                      : rawPayment.toUpperCase() === 'TO_BILL'  ? 'To Bill'
                      : rawPayment;

  /* ── Service mode ───────────────────────────────────── */
  const svcName  = ld?.service_option_name || order.serviceType || '';
  const riskTag  = order.ownersRisk ? ' ( Owners Risk )' : order.carrierRisk ? ' ( Carrier Risk )' : '';
  const svcLine  = `${svcName}${riskTag}`;

  /* ── Invoice / commercial ───────────────────────────── */
  const invoiceNo   = ldInv?.invoice_number || order.invoiceNo || '';
  const ewayBillNo  = ldInv?.eway_bill_number || order.ewayBillNo || '';
  const rawDeclared = ldInv?.invoice_value || order.invoiceValue;
  const declared    = rawDeclared
    ? `${Number(rawDeclared).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';

  /* ── Goods table rows ───────────────────────────────── */
  let descCells = '';
  let pkgCells  = '';

  if (ld?.products?.length) {
    descCells = ld.products.map(p => `• ${p.product_name}`).join('<br>');
    pkgCells  = ld.products.map((p, i) => {
      const item = order.items?.[i];
      return item && (item.dimensionL || item.dimensionW || item.dimensionH)
        ? `• ${p.units} Units (${item.dimensionL || '?'}.00 x ${item.dimensionW || '?'}.00 x ${item.dimensionH || '?'}.00 ${(item.dimensionUnit || 'CMS').toLowerCase()}s)`
        : `• ${p.units} ${p.unit_type}`;
    }).join('<br>');
  } else if (order.items?.length) {
    descCells = order.items.map(i => `• ${i.description || 'GOODS'}`).join('<br>');
    pkgCells  = order.items.map(i => {
      const dims = (i.dimensionL && i.dimensionW && i.dimensionH)
        ? `• ${i.packages || ''} Units (${i.dimensionL} x ${i.dimensionW} x ${i.dimensionH} ${(i.dimensionUnit || 'CMS').toLowerCase()}s)`
        : `• ${i.packages || ''} ${i.packagesType || ''}`;
      return dims;
    }).join('<br>');
  } else {
    descCells = order.itemDescription || 'GOODS';
    pkgCells  = order.packages ? `${order.packages} ${order.packagesType || ''}` : '—';
  }

  /* ── Company header HTML ───────────────────────────── */
  const headerHTML = isAdmin ? `
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;">
      <tr>
        <td style="width:170px;padding:6px 10px;border-right:1.5px solid #000;vertical-align:middle;">
          <div style="font-size:22px;font-weight:900;color:#003087;font-family:Arial Black,Arial,sans-serif;letter-spacing:1px;">DP WORLD</div>
          <div style="width:30px;height:4px;background:#f90;margin-top:2px;border-radius:2px;"></div>
        </td>
        <td style="padding:6px 10px;font-size:8.5px;line-height:1.55;vertical-align:top;">
          <div style="font-size:11px;font-weight:bold;margin-bottom:2px;">DP WORLD EXPRESS LOGISTICS PRIVATE LIMITED</div>
          DP World Ahura Centre, A Wing, 5th Floor, Mahakali Caves Road, Andheri (East) – Mumbai 400 093., WEST, Andheri - 400093, Maharashtra<br>
          E: contact.Express@dpworld.com,T: 928-1000-550&nbsp;&nbsp;&nbsp;Website: www.dpworld.com/india<br>
          <span style="font-weight:bold;">PAN No.:</span>AADCD1983D&nbsp;&nbsp;
          <span style="font-weight:bold;">Service Tax No.:</span>&nbsp;&nbsp;
          <span style="font-weight:bold;">CIN No.:</span>
        </td>
      </tr>
    </table>` : `
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;">
      <tr>
        <td style="width:170px;padding:6px 10px;border-right:1.5px solid #000;vertical-align:middle;">
          <div style="font-size:15px;font-weight:900;color:#000;font-family:Arial Black,Arial,sans-serif;letter-spacing:0.5px;">S K ENTERPRISES</div>
          <div style="font-size:8px;color:#555;margin-top:2px;">Logistics &amp; Supply Chain</div>
        </td>
        <td style="padding:6px 10px;font-size:8.5px;line-height:1.55;vertical-align:top;">
          <div style="font-size:11px;font-weight:bold;margin-bottom:2px;">S K ENTERPRISES</div>
          A/505 Samarpan Apartment, Yashwant Viva Township, Palghar, Maharashtra 401209<br>
          E: info@skenterprises.in&nbsp;&nbsp;&nbsp;T: +91 92810 00550<br>
          <span style="font-weight:bold;">GSTIN:</span>&nbsp;&nbsp;
          <span style="font-weight:bold;">PAN No.:</span>
        </td>
      </tr>
    </table>`;

  const bookingSignatory = isAdmin
    ? 'Signature of Booking Incharge for<br><strong>DP WORLD EXPRESS LOGISTICS PRIVATE LIMITED</strong>'
    : 'Signature of Booking Incharge for<br><strong>S K ENTERPRISES</strong>';

  /* ── Single page HTML ──────────────────────────────── */
  const page = (copyLabel) => `
<div class="docket-page">
  <div class="copy-label">${copyLabel}</div>

  ${headerHTML}

  <!-- Row 2: Vehicle | GCN Title | GCN Details -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="width:200px;padding:4px 8px;border-right:1.5px solid #000;font-size:8.5px;vertical-align:top;">
        <strong>Vehicle No.:</strong><br>
        <strong>Vehicle Type.:</strong>
      </td>
      <td style="padding:4px 8px;text-align:center;border-right:1.5px solid #000;font-size:9.5px;font-weight:bold;vertical-align:middle;">
        <u>GOODS CONSIGNMENT NOTE - Non Negotiable</u>
      </td>
      <td style="width:180px;padding:4px 8px;font-size:8.5px;vertical-align:top;line-height:1.6;">
        <strong>G.C.N.No.:</strong> ${gcnNo}<br>
        <strong>Date.:</strong> ${docketDate}<br>
        <strong>Ref1:</strong> ${order.clientDocketNo}<br>
        <strong>Ref2:</strong>
      </td>
    </tr>
  </table>

  <!-- Row 3: Consignor | Consignee | Route -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="width:36%;padding:5px 8px;border-right:1.5px solid #000;font-size:8.5px;vertical-align:top;line-height:1.5;">
        <strong>Consignor:</strong>&nbsp;${consignorName}<br>
        <strong>Address:</strong>&nbsp;${consignorAddr}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${consignorCityState}${consignorPin ? `, ${consignorPin}` : ''}.
        ${consignorPhone ? `<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${consignorPhone}` : ''}
      </td>
      <td style="width:39%;padding:5px 8px;border-right:1.5px solid #000;font-size:8.5px;vertical-align:top;line-height:1.5;">
        <strong>Consignee:</strong>&nbsp;${consigneeName}<br>
        <strong>Address:</strong>&nbsp;${consigneeAddr}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${consigneeCityState}${consigneePin ? `, ${consigneePin}` : ''}.
        ${consigneePhone ? `<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${consigneePhone}` : ''}
      </td>
      <td style="width:25%;padding:5px 8px;font-size:8.5px;vertical-align:top;line-height:1.8;">
        <strong>BA</strong><br>
        <strong>code</strong><br>
        <strong>From</strong>&nbsp;${fromCity}<br>
        <strong>To</strong>&nbsp;${toCity}
      </td>
    </tr>
  </table>

  <!-- Tin No row -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="width:50%;padding:3px 8px;border-right:1.5px solid #000;font-size:8.5px;"><strong>Tin No:</strong></td>
      <td style="width:50%;padding:3px 8px;font-size:8.5px;"><strong>Tin No:</strong></td>
    </tr>
  </table>

  <!-- Service Tax + Weight -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="padding:3px 8px;font-size:8.5px;text-align:right;border-right:1.5px solid #000;"><strong>Service Tax Payable by:</strong></td>
      <td style="padding:3px 8px;font-size:8.5px;">Consignee</td>
    </tr>
    <tr style="border-top:1px solid #ccc;">
      <td colspan="2" style="padding:3px 8px;font-size:8.5px;">
        <strong>Volume:</strong> ${volume}&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Gross Wt :</strong> ${grossWt}&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Chargeable Wt :</strong> ${chargeableWt}&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Freight:</strong> ${freightLabel}
      </td>
    </tr>
    <tr style="border-top:1px solid #ccc;">
      <td colspan="2" style="padding:3px 8px;font-size:8.5px;">
        <strong>Service Modes:</strong>&nbsp;${svcLine}
      </td>
    </tr>
    <tr style="border-top:1px solid #ccc;">
      <td colspan="2" style="padding:3px 8px;font-size:8.5px;">
        Received the goods for transportation on terms condition printed on our website:
      </td>
    </tr>
  </table>

  <!-- Goods table -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <thead>
      <tr style="background:#f2f2f2;">
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:13%;">Invoice No</th>
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:11%;">Eway bill No</th>
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:28%;">Description of Goods (said to contain)</th>
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:28%;">No of Pkg</th>
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:10%;">Remarks</th>
        <th style="padding:4px 6px;border:1px solid #000;font-size:8px;text-align:left;width:10%;">Trip number</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;">${invoiceNo}</td>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;">${ewayBillNo}</td>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;line-height:1.6;">${descCells}</td>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;line-height:1.6;">${pkgCells}</td>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;"></td>
        <td style="padding:5px 6px;border:1px solid #000;font-size:8.5px;vertical-align:top;"></td>
      </tr>
      <tr><td colspan="6" style="height:18px;border:1px solid #000;"></td></tr>
    </tbody>
  </table>

  <!-- Barcode row -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="width:76%;padding:8px 12px;border-right:1.5px solid #000;text-align:center;vertical-align:middle;">
        <svg class="barcode" data-gcn="${gcnNo}"></svg>
      </td>
      <td style="width:24%;padding:8px;font-size:8.5px;font-weight:bold;text-align:center;vertical-align:middle;line-height:1.6;">
        *PLEASE DO NOT SIGN<br>OR STAMP ON THE<br>BARCODE*
      </td>
    </tr>
  </table>

  <!-- Bottom: Declared value / signatures | Delivery instruction / POD -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;border-top:none;">
    <tr>
      <td style="width:38%;padding:7px 8px;border-right:1.5px solid #000;font-size:8.5px;vertical-align:top;line-height:1.5;">
        <strong>Declared Value:</strong>______<br>
        ${declared ? `${declared}&nbsp;₹` : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;₹'}<br><br>
        <div style="font-size:7.5px;line-height:1.45;">
          I/We do hereby certify that the above particulars of goods consigned by me/us are have and have been correctly entered into and the consignement is booked with full knowledge of the terms and conditions of this G.C.Note, which I/We accept.
        </div>
        <br><br>
        ______________________________<br>
        Signature of Consignor, his Agent or<br>Representative<br><br><br>
        ______________________________<br>
        ${bookingSignatory}
      </td>
      <td style="width:62%;padding:0;font-size:8.5px;vertical-align:top;">
        <div style="padding:6px 8px;border-bottom:1px solid #000;">
          <strong>Delivery Instruction :</strong><br>
          <span style="font-size:8px;">Any Octroi, sales tax, entry tax duties or taxes as may be applicable on the consignment will be paid by consignee at the time of delivery of consignment.</span>
        </div>
        <div style="padding:5px 8px;text-align:center;border-bottom:1px solid #000;font-weight:bold;font-size:9px;">
          Proof of delivery
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 8px;width:55%;border-right:1px solid #000;font-size:8.5px;">Date.:</td>
            <td style="padding:6px 8px;font-size:8.5px;">Time.:</td>
          </tr>
          <tr style="border-top:1px solid #000;">
            <td style="padding:6px 8px;border-right:1px solid #000;border-top:1px solid #000;font-size:8.5px;">Received by (Name Sign):</td>
            <td style="padding:6px 8px;border-top:1px solid #000;font-size:8.5px;">Remarks:</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div style="font-size:7px;color:#444;margin-top:4px;line-height:1.45;">
    The Terms and Conditions of this G.C.Note are mentioned on https://dpworldexpress.shipxtms.in [&ldquo;T&amp;Cs&rdquo;]. If you are unable to see the T&amp;Cs you may contact on 080-40966027 .All disputes are subject to Mumbai jurisdiction only
  </div>
</div>`;

  /* ── Full 3-copy HTML document ─────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GCN Docket – ${gcnNo}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #e8e8e8; }
  .docket-page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
    padding: 10mm 12mm;
    position: relative;
    margin: 0 auto 20px;
  }
  .copy-label {
    position: absolute;
    top: 10mm;
    right: 12mm;
    font-size: 9px;
    font-weight: bold;
    text-align: right;
    line-height: 1.3;
  }
  .page-sep {
    width: 210mm;
    margin: 0 auto;
    border: none;
    border-top: 2px dashed #aaa;
    margin-bottom: 20px;
  }
  @media print {
    body { background: #fff; }
    .docket-page {
      width: 100%;
      min-height: auto;
      padding: 8mm 10mm;
      margin: 0;
      page-break-after: always;
    }
    .page-sep { display: none; }
    .copy-label { top: 8mm; right: 10mm; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
${page('Consignor<br>Copy')}
<hr class="page-sep">
${page('Consignee<br>Copy')}
<hr class="page-sep">
${page('POD<br>Copy')}
<script>
window.onload = function() {
  document.querySelectorAll('svg.barcode').forEach(function(svg) {
    var val = svg.getAttribute('data-gcn');
    try {
      JsBarcode(svg, val, {
        format: 'CODE128',
        width: 1.8,
        height: 45,
        displayValue: true,
        fontSize: 11,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch(e) {
      svg.outerHTML = '<div style="font-family:monospace;font-size:11px;letter-spacing:3px;padding:4px 0;">' + val + '</div>';
    }
  });
  setTimeout(function() { window.print(); }, 600);
};
<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=960,height=720,scrollbars=yes');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
