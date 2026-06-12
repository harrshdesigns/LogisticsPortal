// DP World ExpressTMS Live Integration (ShipX TMS API)
// Auth: stateless X-ShipX-API-Key header — no login call required per request.
// Product names valid for this account: PACKAGE, RETAIL, CARTON, CONSUMER GOODS
// DELEX requires dimensions on every consignment_content item.
// Date format: UTC ISO "YYYY-MM-DDTHH:MM:SSZ"
// Timeout: 60s — the create endpoint is inherently slow (~45s response time).
const axios = require('axios');

const BASE_URL = 'https://expresstms.dpworld.com/integration';

const SERVICE_MAP = {
  SURFACE: 'RETAIL-SURFACE-NORMAL',
  AIR: 'RETAIL-AIR-NORMAL',
  EXPRESS: 'RETAIL-AIR-NORMAL',
  WATER: 'RETAIL-SURFACE-NORMAL',
};

const UNIT_TYPE_MAP = {
  PACKAGES: 'Packages',
  BOXES: 'Cartons',
  BAGS: 'Bags',
  PACKETS: 'Packets',
};

const PAYMENT_MAP = {
  PREPAID: 'prepaid',
  TO_PAY: 'topay',
  TO_BILL: 'tobill',
  COD: 'cod',
};

function formatDateUTC(d) {
  const date = d ? new Date(d) : new Date();
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getCredentials(orderData) {
  return {
    apiKey: orderData.apiKey || process.env.DP_WORLD_API_KEY || 'khZ6ZbZpjsMxfTfVGEAejDqxnh9pyiYhF3sfxX8t3l5y3FQjoGdQjJ1NbAEz',
    companyCode: orderData.extraConfig?.companyCode || process.env.DP_WORLD_COMPANY_CODE || '995137_001',
    companyId: parseInt(orderData.extraConfig?.companyId || process.env.DP_WORLD_COMPANY_ID || '74463', 10),
    companyName: orderData.extraConfig?.companyName || process.env.DP_WORLD_COMPANY_NAME || 'S K ENTERPRISES',
  };
}

// All API calls use X-ShipX-API-Key header. Throws with { rawResponse } on failure.
async function dpwPost(url, body, apiKey, timeout = 60000) {
  try {
    const resp = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-ShipX-API-Key': apiKey,
      },
      timeout,
    });
    return resp.data;
  } catch (e) {
    const status = e.response?.status;
    const raw = e.response?.data ?? { error: e.message };
    const err = new Error(`DP World API error (${status ?? 'network'}): ${JSON.stringify(raw)}`);
    err.rawResponse = raw;
    err.status = status;
    throw err;
  }
}

async function dpwGet(url, apiKey, timeout = 20000) {
  try {
    const resp = await axios.get(url, {
      headers: { 'X-ShipX-API-Key': apiKey },
      timeout,
    });
    return resp.data;
  } catch (e) {
    const status = e.response?.status;
    const raw = e.response?.data ?? { error: e.message };
    const err = new Error(`DP World API error (${status ?? 'network'}): ${JSON.stringify(raw)}`);
    err.rawResponse = raw;
    err.status = status;
    throw err;
  }
}

function buildConsignmentPayload(orderData, isDraft, creds) {
  const items = (orderData.items || []).filter(r => r.description || r.packages);

  // DELEX requires dimensions on every content item. Default to safe values if not provided.
  const contents = items.length > 0
    ? items.map((item, idx) => ({
        product_name: 'PACKAGE',
        product_display_name: item.description || 'GOODS',
        reference_number: item.reference || `${orderData.clientDocketNo || 'REF'}-${idx + 1}`,
        units: String(item.packages || 1),
        unit_type: UNIT_TYPE_MAP[item.packagesType] || 'Cartons',
        weight: String(item.unitWeight || orderData.actualWeight || '1'),
        weight_measure: 'Kgs',
        length: String(item.dimensionL || '30'),
        width: String(item.dimensionW || '20'),
        height: String(item.dimensionH || '20'),
        uom: (item.dimensionUnit || 'CMS').toLowerCase(),
      }))
    : [{
        // Fallback single item using order-level fields
        product_name: 'PACKAGE',
        product_display_name: orderData.itemDescription || 'GOODS',
        units: String(orderData.packages || '1'),
        unit_type: UNIT_TYPE_MAP[orderData.packagesType] || 'Cartons',
        weight: String(orderData.actualWeight || '1'),
        weight_measure: 'Kgs',
        length: String(orderData.dimensionL || '30'),
        width: String(orderData.dimensionW || '20'),
        height: String(orderData.dimensionH || '20'),
        uom: (orderData.dimensionUnit || 'CMS').toLowerCase(),
      }];

  const invoices = orderData.invoiceNo ? [{
    invoice_number: orderData.invoiceNo,
    invoice_value: String(orderData.invoiceValue || '0'),
    invoice_date: orderData.invoiceDate ? new Date(orderData.invoiceDate).toISOString() : new Date().toISOString(),
    cod_amount: String(orderData.codAmount || '0.00'),
    eway_bill_number: orderData.ewayBillNo || '',
    HSN_code: orderData.hsnCode || '',
  }] : [];

  return {
    consignment: {
      shipper_company_code: creds.companyCode,
      is_draft: isDraft ? 'Yes' : 'No',
      consignor_company_id: creds.companyId,
      consignor_company_name: creds.companyName,
      consignor_company_code: creds.companyCode,
      consignor_address_line1: orderData.consignorAddressLine1 || '',
      consignor_address_line2: orderData.consignorAddressLine2 || '',
      consignor_city: orderData.consignorCity || '',
      consignor_state: orderData.consignorState || '',
      consignor_pin: orderData.consignorPin || orderData.consignorPincode || '',
      consignor_contact_name: orderData.consignorContactPerson || orderData.consignorName || creds.companyName,
      consignor_phone: orderData.consignorPhone || '',
      consignee_company_name: orderData.consigneeName || '',
      consignee_address_line1: orderData.consigneeAddressLine1 || '',
      consignee_address_line2: orderData.consigneeAddressLine2 || '',
      consignee_city: orderData.consigneeCity || '',
      consignee_state: orderData.consigneeState || '',
      consignee_pin: orderData.consigneePin || orderData.consigneePincode || '',
      consignee_contact_name: orderData.consigneeContactPerson || orderData.consigneeName || '',
      consignee_phone: orderData.consigneePhone || '',
      reference_number_1: orderData.clientDocketNo || '',
      reference_number_2: '',
      service_option: SERVICE_MAP[orderData.serviceType] || 'RETAIL-SURFACE-NORMAL',
      service_provider_company_code: 'DELEX',
      ready_for_pickup_at: formatDateUTC(orderData.docketDate),
      payment_mode: PAYMENT_MAP[orderData.paymentType] || 'prepaid',
      weight: String(orderData.actualWeight || ''),
      weight_measure: 'Kgs',
      consignment_type: 'OUTBOUND',
      consignment_contents: { consignment_content: contents },
      consignment_invoices: { consignment_invoice: invoices },
    },
  };
}

const DPWorldAdapter = {
  async checkRates(orderData) {
    const creds = getCredentials(orderData);
    const payload = buildConsignmentPayload(orderData, true, creds);

    // Creates a draft consignment — DP World's rate-check mechanism.
    // Returns delivery branch and service option confirmation.
    const data = await dpwPost(
      `${BASE_URL}/consignments/create.json`,
      payload,
      creds.apiKey,
      65000,
    );

    const c = data?.consignment;
    return {
      success: true,
      partner: 'DP_WORLD',
      checkedAt: new Date().toISOString(),
      draftId: c?.id || null,
      deliveryBranch: c?.delivery_branch_city || null,
      serviceOption: c?.service_option_name || null,
      rawResponse: data,
    };
  },

  async bookShipment(orderData) {
    const creds = getCredentials(orderData);
    const payload = buildConsignmentPayload(orderData, false, creds);

    let data;
    try {
      data = await dpwPost(
        `${BASE_URL}/consignments/create.json`,
        payload,
        creds.apiKey,
        65000,
      );
    } catch (e) {
      return { success: false, rawResponse: e.rawResponse || { error: e.message } };
    }

    const c = data?.consignment;
    const consignmentNo = c?.number;

    // "draft" means is_draft was Yes — for real bookings this will be the LR number
    if (!consignmentNo || consignmentNo === 'draft') {
      return {
        success: false,
        rawResponse: data,
        error: 'Booking did not return a consignment number',
      };
    }

    return {
      success: true,
      partnerDocketNo: consignmentNo,
      estimatedDelivery: null,
      rawResponse: data,
    };
  },

  async trackShipment(partnerDocketNo, credentials = {}) {
    const creds = getCredentials(credentials);

    // Step 1: Get tracking summary
    let trackData;
    try {
      trackData = await dpwPost(
        `${BASE_URL}/consignments/track.json`,
        { lr: { number: partnerDocketNo } },
        creds.apiKey,
        20000,
      );
    } catch (e) {
      return { events: [] };
    }

    const lr = trackData?.lr;
    if (!lr?.id) return { events: [], rawResponse: trackData };

    // Step 2: Get full event history from detail endpoint
    let detailData;
    try {
      detailData = await dpwGet(
        `${BASE_URL}/consignments/${lr.id}/detail.json`,
        creds.apiKey,
        20000,
      );
    } catch (e) {
      // Fall back to summary-only if detail fails
      return {
        events: [{
          status: lr.state?.toUpperCase() || 'IN_TRANSIT',
          description: lr.tracking_status || '',
          location: lr.consignee_city || '',
          timestamp: new Date().toISOString(),
        }],
        rawResponse: trackData,
      };
    }

    const events = detailData?.lr?.events || [];

    return {
      events: events.map(ev => ({
        status: ev.event_type || 'IN_TRANSIT',
        description: ev.description || ev.event_type || '',
        location: ev.event_location_display_name || '',
        timestamp: ev.occurred_at || ev.recorded_at || new Date().toISOString(),
      })),
      rawResponse: detailData,
    };
  },
};

module.exports = DPWorldAdapter;
