const axios = require('axios');
const { calculateRelevanceScore, extractTags } = require('../scoring');

const HH_API_URL = 'https://api.hh.ru/vacancies';

async function fetchHeadHunterLeads() {
  try {
    const response = await axios.get(HH_API_URL, {
      params: {
        text: 'playable OR "HTML5 баннер" OR "interactive ads"',
        per_page: 20,
        order_by: 'publication_time'
      },
      headers: {
        'User-Agent': 'LeadPlay-TelegramMiniApp/1.0 (leadplay@example.com)'
      },
      timeout: 8000
    });

    const items = response.data.items || [];
    const leads = [];

    for (const item of items) {
      const title = item.name || '';
      const snippet = (item.snippet?.requirement || '') + ' ' + (item.snippet?.responsibility || '');
      const url = item.alternate_url || `https://hh.ru/vacancy/${item.id}`;
      const pubDate = item.published_at ? new Date(item.published_at).toISOString() : new Date().toISOString();

      let budgetStr = 'По договоренности';
      if (item.salary) {
        const from = item.salary.from ? `от ${item.salary.from.toLocaleString('ru-RU')}` : '';
        const to = item.salary.to ? `до ${item.salary.to.toLocaleString('ru-RU')}` : '';
        const currency = item.salary.currency === 'RUR' || item.salary.currency === 'RUB' ? '₽' : item.salary.currency;
        budgetStr = `${from} ${to} ${currency}`.trim();
      }

      const score = calculateRelevanceScore(title, snippet, []);
      const tags = extractTags(title + ' ' + snippet);

      leads.push({
        external_id: `hh_${item.id}`,
        title,
        description: snippet.replace(/<[^>]*>?/gm, '').trim() || 'Разработка и поддержка рекламных/интерактивных креативов.',
        budget: budgetStr,
        currency: item.salary?.currency || 'RUB',
        url,
        source: 'HeadHunter',
        source_code: 'HH',
        cls: 'hh',
        tags,
        score,
        pub_date: pubDate
      });
    }

    return leads;
  } catch (error) {
    console.error('[Scraper] HeadHunter error:', error.message);
    return [];
  }
}

module.exports = fetchHeadHunterLeads;
