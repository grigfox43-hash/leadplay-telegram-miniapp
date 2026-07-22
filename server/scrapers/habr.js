const Parser = require('rss-parser');
const parser = new Parser();
const { calculateRelevanceScore, extractTags } = require('../scoring');

/**
 * Scraper for Хабр Карьера (career.habr.com)
 * Replaces old closed Habr Freelance service.
 */
async function fetchHabrLeads() {
  const leads = [];
  const rssUrl = 'https://career.habr.com/vacancies/rss';

  try {
    const feed = await parser.parseURL(rssUrl);
    for (const item of feed.items || []) {
      const title = item.title || '';
      const description = (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...';
      const link = item.link || item.guid || '';
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

      const fullText = title + ' ' + description;
      const score = calculateRelevanceScore(title, description, []);

      if (score >= 50 || /разработк|верстк|дизайн|баннер|игра|сайт|html|js|game|mobile|анимаци/i.test(fullText)) {
        const tags = extractTags(fullText);

        leads.push({
          external_id: link || `habr_career_${Date.now()}_${Math.random()}`,
          title,
          description,
          budget: 'Договорная на Хабр Карьере',
          currency: 'RUB',
          url: link,
          source: 'Хабр Карьера',
          source_code: 'HB',
          cls: 'tg',
          tags,
          score,
          pub_date: pubDate
        });
      }
    }
  } catch (err) {
    console.warn('[Scraper] Habr Career RSS skipped:', err.message);
  }

  return leads;
}

module.exports = fetchHabrLeads;
