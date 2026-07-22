const Parser = require('rss-parser');
const parser = new Parser();
const { calculateRelevanceScore, extractTags } = require('../scoring');

const HABR_RSS_URL = 'https://freelance.habr.com/tasks.rss';

async function fetchHabrLeads() {
  try {
    const feed = await parser.parseURL(HABR_RSS_URL);
    const leads = [];

    for (const item of feed.items || []) {
      const title = item.title || '';
      const description = item.contentSnippet || item.content || '';
      const link = item.link || '';
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

      const score = calculateRelevanceScore(title, description, []);
      
      // Filter for relevant or general web/game leads
      if (score >= 60 || /playable|html5|баннер|banner|game|игра|интерактив/i.test(title + ' ' + description)) {
        const tags = extractTags(title + ' ' + description);
        
        leads.push({
          external_id: link,
          title,
          description: description.replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...',
          budget: item.categories ? item.categories.join(', ') : 'Договорная',
          currency: 'RUB',
          url: link,
          source: 'Habr Freelance',
          source_code: 'HB',
          cls: 'tg', // theme styling class
          tags,
          score,
          pub_date: pubDate
        });
      }
    }

    return leads;
  } catch (error) {
    console.error('[Scraper] Habr error:', error.message);
    return [];
  }
}

module.exports = fetchHabrLeads;
