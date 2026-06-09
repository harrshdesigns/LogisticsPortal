// TODO: Replace with real API integration — https://developers.delhivery.com/

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];

function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

const DelhiveryAdapter = {
  async bookShipment(orderData) {
    await new Promise(r => setTimeout(r, 500));
    const partnerDocketNo = `DLVR-${randomId(8)}`;
    const estimatedDelivery = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    return {
      success: true,
      partnerDocketNo,
      estimatedDelivery,
      rawResponse: { waybill: partnerDocketNo, status: 'Success', cod_amount: orderData.declaredValue },
    };
  },

  async trackShipment(partnerDocketNo) {
    await new Promise(r => setTimeout(r, 300));
    const now = Date.now();
    return {
      events: [
        { status: 'PICKED_UP', description: 'Shipment picked up from shipper', location: randomCity(), timestamp: new Date(now - 72 * 3600000).toISOString() },
        { status: 'IN_TRANSIT', description: 'Shipment in transit', location: randomCity(), timestamp: new Date(now - 48 * 3600000).toISOString() },
        { status: 'AT_HUB', description: 'Arrived at Delhivery hub', location: randomCity(), timestamp: new Date(now - 24 * 3600000).toISOString() },
        { status: 'OUT_FOR_DELIVERY', description: 'Out for delivery', location: randomCity(), timestamp: new Date(now - 4 * 3600000).toISOString() },
      ],
    };
  },
};

module.exports = DelhiveryAdapter;
