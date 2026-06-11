// TODO: Replace with real API integration — VRL Logistics API

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Nagpur', 'Indore', 'Surat'];

function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}
function randomId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

const VRLAdapter = {
  async bookShipment(orderData) {
    await new Promise(r => setTimeout(r, 500));
    const partnerDocketNo = `VRL-${randomId(8)}`;
    return {
      success: true,
      partnerDocketNo,
      estimatedDelivery: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
      rawResponse: { lr_number: partnerDocketNo, booking_status: 'ACCEPTED' },
    };
  },

  async trackShipment(partnerDocketNo) {
    await new Promise(r => setTimeout(r, 300));
    const now = Date.now();
    return {
      events: [
        { status: 'BOOKED', description: 'LR generated at origin branch', location: randomCity(), timestamp: new Date(now - 80 * 3600000).toISOString() },
        { status: 'PICKED_UP', description: 'Goods collected from shipper', location: randomCity(), timestamp: new Date(now - 72 * 3600000).toISOString() },
        { status: 'IN_TRANSIT', description: 'In transit', location: randomCity(), timestamp: new Date(now - 50 * 3600000).toISOString() },
        { status: 'AT_HUB', description: 'Arrived at destination hub', location: randomCity(), timestamp: new Date(now - 20 * 3600000).toISOString() },
      ],
    };
  },
};

module.exports = VRLAdapter;
