const cron = require('node-cron');
const { runAllScrapers } = require('./scrapers');
const { notifyUsersAboutNewLeads } = require('./bot');

const intervalMinutes = parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10);
const cronSchedule = `*/${intervalMinutes} * * * *`;

function startContinuousMonitoring() {
  console.log(`[Cron Scheduler] Continuous order monitoring active! Running every ${intervalMinutes} minutes (${cronSchedule}).`);

  // Initial immediate check on startup
  setTimeout(async () => {
    try {
      console.log('[Cron Scheduler] Running initial startup scrape...');
      const res = await runAllScrapers();
      console.log(`[Cron Scheduler] Startup check complete. Total leads in DB: ${res.totalCount}`);
    } catch (err) {
      console.error('[Cron Scheduler] Startup scrape failed:', err.message);
    }
  }, 1500);

  // Scheduled periodic task
  cron.schedule(cronSchedule, async () => {
    console.log(`[Cron Scheduler] Triggering scheduled scraping cycle at ${new Date().toLocaleTimeString('ru-RU')}...`);
    try {
      const result = await runAllScrapers();
      if (result.newCount > 0) {
        console.log(`[Cron Scheduler] Found ${result.newCount} new matching leads! Checking notifications...`);
        // Notify bot subscribers if any new leads were inserted
        const { all } = require('./db');
        const latestLeads = await all('SELECT * FROM leads ORDER BY fetched_at DESC LIMIT ?', [result.newCount]);
        const parsedLeads = latestLeads.map(l => ({ ...l, tags: JSON.parse(l.tags || '[]') }));
        await notifyUsersAboutNewLeads(parsedLeads);
      }
    } catch (err) {
      console.error('[Cron Scheduler] Scheduled scraping cycle error:', err.message);
    }
  });
}

module.exports = {
  startContinuousMonitoring
};
