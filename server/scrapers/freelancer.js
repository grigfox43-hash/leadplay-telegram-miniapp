const Parser = require('rss-parser');
const parser = new Parser();
const { calculateRelevanceScore, extractTags } = require('../scoring');

const FREELANCER_RSS_URL = 'https://www.freelancer.com/rss.xml';

async function fetchFreelancerLeads() {
  try {
    const feed = await parser.parseURL(FREELANCER_RSS_URL);
    const leads = [];

    for (const item of feed.items || []) {
      const title = item.title || '';
      const description = item.contentSnippet || item.content || '';
      const link = item.link || '';
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

      const fullText = title + ' ' + description;
      const score = calculateRelevanceScore(title, description, []);

      if (score >= 60 || /playable|html5|banner|canvas|game|interactive/i.test(fullText)) {
        const tags = extractTags(fullText);

        leads.push({
          external_id: link,
          title,
          description: description.replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...',
          budget: '$300–$900 fixed',
          currency: 'USD',
          url: link,
          source: 'Freelancer',
          source_code: 'FR',
          cls: 'fr',
          tags,
          score,
          pub_date: pubDate
        });
      }
    }

    return leads;
  } catch (error) {
    console.error('[Scraper] Freelancer error:', error.message);
    return [];
  }
}

module.exports = fetchFreelancerLeads;
