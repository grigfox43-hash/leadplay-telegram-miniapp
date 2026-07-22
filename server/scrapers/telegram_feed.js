const axios = require('axios');
const { calculateRelevanceScore, extractTags } = require('../scoring');

const CHANNELS = [
  'freelance_ru',
  'webdev_jobs',
  'gamedev_jobs',
  'remote_job'
];

async function fetchTelegramLeads() {
  const leads = [];

  for (const channel of CHANNELS) {
    try {
      const url = `https://t.me/s/${channel}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 7000
      });

      const html = response.data || '';
      // Parse telegram posts using simple regex matching message text blocks
      const messageRegex = /<div class="tgme_widget_message_text[^">]*">([\s\S]*?)<\/div>/gi;
      const linkRegex = /href="(https:\/\/t\.me\/[^\/]+\/\d+)"/i;

      let match;
      let count = 0;

      while ((match = messageRegex.exec(html)) !== null && count < 10) {
        count++;
        const rawText = match[1] || '';
        const cleanText = rawText.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').trim();

        if (!cleanText || cleanText.length < 30) continue;

        const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0] ? lines[0].substring(0, 100) : 'Заказ в Telegram канале';
        const description = cleanText.substring(0, 350);

        const score = calculateRelevanceScore(title, cleanText, []);

        if (score >= 55 || /playable|html5|баннер|banner|game|разработка|игра/i.test(cleanText)) {
          const tags = extractTags(cleanText);
          const postUrl = `https://t.me/s/${channel}`;

          leads.push({
            external_id: `tg_${channel}_${Date.now()}_${count}`,
            title: title.length > 80 ? title.substring(0, 77) + '...' : title,
            description,
            budget: 'Договорная в TG',
            currency: 'RUB',
            url: postUrl,
            source: `Telegram (@${channel})`,
            source_code: 'TG',
            cls: 'tg',
            tags,
            score,
            pub_date: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.warn(`[Scraper] Telegram @${channel} skipped:`, error.message);
    }
  }

  return leads;
}

module.exports = fetchTelegramLeads;
