// TODO: Replace with real API integration — DP World Logistics API

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}
function randomId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

const DPWorldAdapter = {
  async bookShipment(orderData) {
    await new Promise(r => setTimeout(r, 500));
    const partnerDocketNo = `DPW-${randomId(8)}`;
    return {
      success: true,
      partnerDocketNo,
      estimatedDelivery: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
      rawResponse: { booking_ref: partnerDocketNo, status: 'CONFIRMED' },
    };
  },

  async trackShipment(partnerDocketNo) {
    await new Promise(r => setTimeout(r, 300));
    const now = Date.now();
    return {
      events: [
        { status: 'BOOKED', description: 'Shipment confirmed', location: randomCity(), timestamp: new Date(now - 60 * 3600000).toISOString() },
        { status: 'PICKED_UP', description: 'Package collected by courier', location: randomCity(), timestamp: new Date(now - 48 * 3600000).toISOString() },
        { status: 'IN_TRANSIT', description: 'In transit', location: randomCity(), timestamp: new Date(now - 30 * 3600000).toISOString() },
        { status: 'AT_HUB', description: 'Arrived at destination hub', location: randomCity(), timestamp: new Date(now - 10 * 3600000).toISOString() },
        { status: 'OUT_FOR_DELIVERY', description: 'Assigned to delivery agent', location: randomCity(), timestamp: new Date(now - 2 * 3600000).toISOString() },
      ],
    };
  },
};

module.exports = DPWorldAdapter;
