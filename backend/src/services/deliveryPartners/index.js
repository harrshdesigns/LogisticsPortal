const DelhiveryAdapter = require('./delhivery');
const DPWorldAdapter = require('./dpworld');
const VRLAdapter = require('./vrl');
const DTDCAdapter = require('./dtdc');

const adapters = {
  DELHIVERY: DelhiveryAdapter,
  DP_WORLD: DPWorldAdapter,
  VRL: VRLAdapter,
  DTDC: DTDCAdapter,
};

function getAdapter(partnerName) {
  const adapter = adapters[partnerName];
  if (!adapter) throw new Error(`Unknown delivery partner: ${partnerName}`);
  return adapter;
}

module.exports = { getAdapter };
