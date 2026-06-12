// DP World ExpressTMS Live Integration
const axios = require('axios');

const BASE_URL = 'https://expresstms.dpworld.com/integration';

// Module-level token cache (survives across requests, cleared on restart)
let _token = null;
let _tokenExpiry = 0;

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

function formatDate(d) {
  const date = d ? new Date(d) : new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getCredentials(orderData) {
  return {
    login: orderData.loginId || process.env.DP_WORLD_LOGIN || 'skent_api',
    password: orderData.apiSecret || process.env.DP_WORLD_PASSWORD || 'SKent@2026',
    apiKey: orderData.apiKey || process.env.DP_WORLD_API_KEY || 'khZ6ZbZpjsMxfTfVGEAejDqxnh9pyiYhF3sfxX8t3l5y3FQjoGdQjJ1NbAEz',
    companyCode: orderData.extraConfig?.companyCode || process.env.DP_WORLD_COMPANY_CODE || '995137_001',
    companyId: orderData.extraConfig?.companyId || process.env.DP_WORLD_COMPANY_ID || '74463',
    companyName: orderData.extraConfig?.companyName || process.env.DP_WORLD_COMPANY_NAME || 'S K ENTERPRISES',
  };
}

async function getToken(creds) {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const resp = await axios.post(`${BASE_URL}/users/login.json`, {
    user: {
      login: creds.login,
      password: creds.password,
      api_key: creds.apiKey,
    },
  }, { timeout: 15000 });

  const data = resp.data;
  const token = data?.user?.token || data?.user?.authentication_token || data?.token;
  if (!token) throw Object.assign(new Error('DP World login failed: no token in response'), { rawResponse: data });

  _token = token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
  return _token;
}

function buildConsignmentPayload(orderData, isDraft, creds) {
  const items = (orderData.items || []).filter(r => r.description || r.packages);
  const riskType = orderData.ownersRisk ? 'owners risk' : 'carriers risk';
  const specialService = orderData.ownersRisk ? 'Owners Risk' : 'Carriers Risk';

  const contents = items.map((item, idx) => ({
    reference_number: item.reference || `${orderData.clientDocketNo || 'REF'}-${idx + 1}`,
    delivery_number: '',
    product_id: '',
    product_name: item.description || 'GOODS',
    product_display_name: item.description || 'GOODS',
    units: String(item.packages || 1),
    unit_type: UNIT_TYPE_MAP[item.packagesType] || 'Packages',
    weight: String(item.unitWeight || ''),
    weight_measure: 'Kgs',
    length: String(item.dimensionL || ''),
    width: String(item.dimensionW || ''),
    height: String(item.dimensionH || ''),
    uom: (item.dimensionUnit || 'CMS').toLowerCase(),
  }));

  const invoices = orderData.invoiceNo ? [{
    invoice_number: orderData.invoiceNo,
    delivery_number: '',
    invoice_value: String(orderData.invoiceValue || '0'),
    invoice_date: orderData.invoiceDate ? new Date(orderData.invoiceDate).toISOString() : new Date().toISOString(),
    cod_amount: String(orderData.codAmount || '0.00'),
    weight: '',
    weight_measure: '',
    pickable_units: '',
    eway_bill_number: orderData.ewayBillNo || '',
    eway_bill_expiry_date: '',
    HSN_code: orderData.hsnCode || '',
  }] : [];

  return {
    consignment: {
      consolidate: 'No',
      shipper_company_code: creds.companyCode,
      consignment_number: '',
      is_draft: isDraft ? 'Yes' : 'No',
      from_challan_id: '',
      consignor_company_id: creds.companyId,
      consignor_company_name: creds.companyName,
      consignor_company_code: creds.companyCode,
      consignor_facility_name: '',
      consignor_facility_code: '',
      consignor_address_line1: orderData.consignorAddressLine1 || orderData.consignorAddress || '',
      consignor_address_line2: orderData.consignorAddressLine2 || '',
      consignor_city: orderData.consignorCity || '',
      consignor_state: orderData.consignorState || '',
      consignor_pin: orderData.consignorPin || orderData.consignorPincode || '',
      consignor_contact_name: orderData.consignorContactPerson || orderData.consignorName || creds.companyName,
      consignor_phone: orderData.consignorPhone || '',
      consignee_company_id: '',
      consignee_company_name: orderData.consigneeName || '',
      consignee_company_code: orderData.consigneeName || '',
      consignee_facility_name: '',
      consignee_facility_code: '',
      consignee_address_line1: orderData.consigneeAddressLine1 || orderData.consigneeAddress || '',
      consignee_address_line2: orderData.consigneeAddressLine2 || '',
      consignee_address_line3: '',
      consignee_city: orderData.consigneeCity || '',
      consignee_state: orderData.consigneeState || '',
      consignee_pin: orderData.consigneePin || orderData.consigneePincode || '',
      consignee_contact_name: orderData.consigneeContactPerson || orderData.consigneeName || '',
      consignee_phone: orderData.consigneePhone || '',
      reference_number_1: orderData.clientDocketNo || '',
      reference_number_2: orderData.partnerDocketNo || '',
      service_option: SERVICE_MAP[orderData.serviceType] || 'RETAIL-SURFACE-NORMAL',
      service_provider_company_code: 'DELEX',
      vehicle_number: '',
      driver1_id: '',
      volume: '',
      volume_measure: '',
      ready_for_pickup_at: formatDate(orderData.docketDate),
      payment_mode: PAYMENT_MAP[orderData.paymentType] || 'prepaid',
      slot_date: '',
      slot_name: '',
      slot_company_code: '',
      weight: String(orderData.actualWeight || ''),
      weight_measure: 'Kgs',
      consignment_type: 'OUTBOUND',
      service_provider_id: '',
      service_provider_name: '',
      service_provider_code: '',
      risk_at: riskType,
      consignment_special_services: {
        consignment_special_service: [specialService],
      },
      consignment_contents: { consignment_content: contents },
      consignment_invoices: { consignment_invoice: invoices },
    },
  };
}

const DPWorldAdapter = {
  async checkRates(orderData) {
    const creds = getCredentials(orderData);
    const token = await getToken(creds);
    const payload = buildConsignmentPayload(orderData, true, creds);

    const resp = await axios.post(`${BASE_URL}/consignments/create.json`, payload, {
      headers: { 'X-User-Token': token, 'X-User-Email': creds.login, 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    return {
      success: true,
      partner: 'DP_WORLD',
      checkedAt: new Date().toISOString(),
      draftConsignmentNo: resp.data?.consignment?.consignment_number || null,
      rawResponse: resp.data,
    };
  },

  async bookShipment(orderData) {
    const creds = getCredentials(orderData);
    let token;
    try {
      token = await getToken(creds);
    } catch (e) {
      return { success: false, rawResponse: e.rawResponse || { error: e.message } };
    }

    const payload = buildConsignmentPayload(orderData, false, creds);

    let resp;
    try {
      resp = await axios.post(`${BASE_URL}/consignments/create.json`, payload, {
        headers: { 'X-User-Token': token, 'X-User-Email': creds.login, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
    } catch (e) {
      const raw = e.response?.data || { error: e.message };
      return { success: false, rawResponse: raw };
    }

    const consignmentNo = resp.data?.consignment?.consignment_number;
    if (!consignmentNo) {
      return { success: false, rawResponse: resp.data };
    }

    return {
      success: true,
      partnerDocketNo: consignmentNo,
      estimatedDelivery: resp.data?.consignment?.estimated_delivery || null,
      rawResponse: resp.data,
    };
  },

  async trackShipment(partnerDocketNo, credentials = {}) {
    const creds = getCredentials(credentials);
    let token;
    try {
      token = await getToken(creds);
    } catch (e) {
      return { events: [] };
    }

    let resp;
    try {
      resp = await axios.post(`${BASE_URL}/consignments/list.json`, {
        consignment: { consignment_number: partnerDocketNo },
      }, {
        headers: { 'X-User-Token': token, 'X-User-Email': creds.login, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    } catch (e) {
      return { events: [] };
    }

    // Normalize tracking events from DP World response
    const raw = resp.data;
    const events = [];

    const trackingData = raw?.consignment?.tracking_events
      || raw?.consignments?.[0]?.tracking_events
      || raw?.tracking_events
      || [];

    for (const ev of trackingData) {
      events.push({
        status: ev.status || 'IN_TRANSIT',
        description: ev.description || ev.remarks || ev.status || '',
        location: ev.location || ev.city || '',
        timestamp: ev.timestamp || ev.event_time || new Date().toISOString(),
      });
    }

    return { events, rawResponse: raw };
  },
};

module.exports = DPWorldAdapter;
