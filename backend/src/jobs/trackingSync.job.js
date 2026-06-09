const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { getAdapter } = require('../services/deliveryPartners');

const prisma = new PrismaClient();

// Runs every 30 minutes — syncs tracking for BOOKED and IN_TRANSIT orders
function startTrackingSyncJob() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Running tracking sync...');
    try {
      const shipments = await prisma.shipment.findMany({
        where: {
          order: { status: { in: ['BOOKED', 'IN_TRANSIT'] } },
          partnerName: { not: 'MANUAL' },
          partnerDocketNo: { not: null },
        },
        include: {
          trackingEvents: { orderBy: { timestamp: 'desc' } },
          order: true,
        },
      });

      let synced = 0;
      for (const shipment of shipments) {
        try {
          const adapter = getAdapter(shipment.partnerName);
          const result = await adapter.trackShipment(shipment.partnerDocketNo);

          for (const ev of result.events) {
            const ts = new Date(ev.timestamp);
            const exists = shipment.trackingEvents.some(
              e => e.status === ev.status && Math.abs(new Date(e.timestamp) - ts) < 60000
            );
            if (!exists) {
              await prisma.trackingEvent.create({
                data: {
                  shipmentId: shipment.id,
                  status: ev.status,
                  description: ev.description,
                  location: ev.location,
                  timestamp: ts,
                  source: 'API',
                },
              });
              synced++;

              // Update order status based on tracking
              if (ev.status === 'DELIVERED') {
                await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
              } else if (ev.status === 'OUT_FOR_DELIVERY') {
                await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'OUT_FOR_DELIVERY' } });
              } else if (['IN_TRANSIT', 'AT_HUB'].includes(ev.status)) {
                if (shipment.order.status === 'BOOKED') {
                  await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'IN_TRANSIT' } });
                }
              }
            }
          }
        } catch (e) {
          console.error(`[CRON] Tracking sync failed for ${shipment.partnerDocketNo}:`, e.message);
        }
      }
      console.log(`[CRON] Tracking sync complete. ${synced} new events added.`);
    } catch (e) {
      console.error('[CRON] Tracking sync job error:', e.message);
    }
  });

  console.log('[CRON] Tracking sync job scheduled every 30 minutes');
}

module.exports = { startTrackingSyncJob };
