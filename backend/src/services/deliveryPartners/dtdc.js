// TODO: Replace with real API integration — DTDC Courier API

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Lucknow', 'Chandigarh'];

function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}
function randomId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

const DTDCAdapter = {
  async bookShipment(orderData) {
    await new Promise(r => setTimeout(r, 500));
    const partnerDocketNo = `DTDC-${randomId(8)}`;
    return {
      success: true,
      partnerDocketNo,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      rawResponse: { consignment_no: partnerDocketNo, status: 'Booked' },
    };
  },

  async trackShipment(partnerDocketNo) {
    await new Promise(r => setTimeout(r, 300));
    const now = Date.now();
    return {
      events: [
        { status: 'PICKED_UP', description: 'Shipment picked up', location: randomCity(), timestamp: new Date(now - 65 * 3600000).toISOString() },
        { status: 'IN_TRANSIT', description: 'In transit to destination', location: randomCity(), timestamp: new Date(now - 45 * 3600000).toISOString() },
        { status: 'AT_HUB', description: 'Arrived at DTDC hub', location: randomCity(), timestamp: new Date(now - 12 * 3600000).toISOString() },
      ],
    };
  },
};

module.exports = DTDCAdapter;
