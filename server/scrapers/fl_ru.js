const Parser = require('rss-parser');
const parser = new Parser();
const { calculateRelevanceScore, extractTags } = require('../scoring');

const FEEDS = [
  { name: 'FL.ru', code: 'FL', url: 'https://www.fl.ru/rss/all.xml' },
  { name: 'Freelance.ru', code: 'FR_RU', url: 'https://freelance.ru/rss/index' },
  { name: 'Freelancehunt', code: 'FH', url: 'https://freelancehunt.com/rss/projects' }
];

async function fetchRussianFreelanceLeads() {
  const leads = [];

  for (const source of FEEDS) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items || []) {
        const title = item.title || '';
        const description = item.contentSnippet || item.content || '';
        const link = item.link || item.guid || '';
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

        const fullText = title + ' ' + description;
        const score = calculateRelevanceScore(title, description, []);

        // Flexible filter for Russian IT, web, game, design, banners, or general freelance jobs
        if (score >= 50 || /разработк|верстк|дизайн|баннер|игра|сайт|html|js|game|mobile|анимаци/i.test(fullText)) {
          const tags = extractTags(fullText);

          leads.push({
            external_id: link || `feed_${Date.now()}_${Math.random()}`,
            title,
            description: description.replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...',
            budget: 'Договорная',
            currency: 'RUB',
            url: link,
            source: source.name,
            source_code: source.code,
            cls: 'tg',
            tags,
            score,
            pub_date: pubDate
          });
        }
      }
    } catch (err) {
      console.warn(`[Scraper] ${source.name} RSS skipped:`, err.message);
    }
  }

  return leads;
}

module.exports = fetchRussianFreelanceLeads;
