const axios = require('axios');
const Parser = require('rss-parser');
const parser = new Parser();
const { calculateRelevanceScore, extractTags } = require('../scoring');

const GLOBAL_RSS_FEEDS = [
  { name: 'WeWorkRemotely', code: 'WWR', url: 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss' },
  { name: 'Guru.com', code: 'GURU', url: 'https://www.guru.com/rss/jobs/' }
];

async function fetchGlobalLeads() {
  const leads = [];

  // 1. Fetch from Remotive API (Worldwide Remote Jobs)
  try {
    const res = await axios.get('https://remotive.com/api/remote-jobs?category=software-dev&limit=15', { timeout: 6000 });
    const jobs = res.data?.jobs || [];
    for (const j of jobs) {
      const title = j.title || '';
      const description = (j.description || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...';
      const url = j.url || 'https://remotive.com';
      const score = calculateRelevanceScore(title, description, j.tags || []);

      leads.push({
        external_id: `remotive_${j.id}`,
        title,
        description,
        budget: j.salary || '$50–$100 / hr',
        currency: 'USD',
        url,
        source: 'Remotive',
        source_code: 'REM',
        cls: 'global',
        tags: extractTags(title + ' ' + description),
        score,
        pub_date: j.publication_date || new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('[Scraper] Remotive API skipped:', e.message);
  }

  // 2. Fetch from RSS Feeds (WWR & Guru)
  for (const source of GLOBAL_RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of (feed.items || []).slice(0, 10)) {
        const title = item.title || '';
        const description = (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 300) + '...';
        const link = item.link || item.guid || '';
        const score = calculateRelevanceScore(title, description, []);

        leads.push({
          external_id: link || `global_${Date.now()}_${Math.random()}`,
          title,
          description,
          budget: '$500–$3,000',
          currency: 'USD',
          url: link,
          source: source.name,
          source_code: source.code,
          cls: 'global',
          tags: extractTags(title + ' ' + description),
          score,
          pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn(`[Scraper] ${source.name} RSS skipped:`, e.message);
    }
  }

  return leads;
}

module.exports = fetchGlobalLeads;
