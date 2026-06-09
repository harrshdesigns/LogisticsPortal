const cron = require('node-cron');
const { generateMISReport } = require('../services/mis.service');

// Runs every day at 8:00 AM — generates yesterday's MIS and emails all SUPER_ADMINs
function startDailyMISJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily MIS generation...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    try {
      await generateMISReport(dateStr, dateStr);
      console.log(`[CRON] Daily MIS for ${dateStr} generated and sent.`);
    } catch (e) {
      console.error('[CRON] Daily MIS failed:', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[CRON] Daily MIS job scheduled at 08:00 IST');
}

module.exports = { startDailyMISJob };
