const fetchHabrLeads = require('./habr');
const fetchHeadHunterLeads = require('./headhunter');
const fetchFreelancerLeads = require('./freelancer');
const fetchTelegramLeads = require('./telegram_feed');
const fetchRussianFreelanceLeads = require('./fl_ru');
const fetchGlobalLeads = require('./global_freelance');
const { run, all, get } = require('../db');

// Seed leads focused on Russian and Global orders with sample customer contacts
const SEED_LEADS = [
  {
    external_id: 'seed_ru_1',
    title: 'Разработчик playable ads для мобильной игры',
    description: 'Ищем разработчика интерактивных рекламных креативов. JavaScript, Canvas/WebGL, оптимизация под рекламные сети (Unity Ads, AppLovin, IronSource). Писать в TG: @game_producer_ads',
    budget: '70 000–120 000 ₽ за проект',
    currency: 'RUB',
    url: 'https://t.me/freelance_ru',
    source: 'Telegram (@freelance_ru)',
    source_code: 'TG',
    cls: 'tg',
    tags: ['Playable', 'JavaScript', 'WebGL'],
    score: 96,
    contacts: '@game_producer_ads',
    pub_date: new Date(Date.now() - 3600 * 1000 * 1).toISOString()
  },
  {
    external_id: 'seed_ru_2',
    title: 'HTML5-баннеры и интерактивные анимации GSAP',
    description: 'Проектная занятость: разработка адаптивных рекламных баннеров, анимация на GSAP и оптимизация веса под требования Google DV360 и Яндекс. Email: hr@bannertech.ru',
    budget: 'от 120 000 ₽/мес.',
    currency: 'RUB',
    url: 'https://hh.ru',
    source: 'HeadHunter',
    source_code: 'HH',
    cls: 'hh',
    tags: ['HTML5 баннер', 'GSAP', 'Яндекс'],
    score: 92,
    contacts: 'hr@bannertech.ru',
    pub_date: new Date(Date.now() - 3600 * 1000 * 3).toISOString()
  },
  {
    external_id: 'seed_global_1',
    title: 'Senior Playable Ads Developer (Unity / PixiJS)',
    description: 'Looking for an experienced Playable Ads Developer to build high-converting playable ads for iOS and Android game titles. Contact: lead_ad_studio@proton.me',
    budget: '$3,500 - $6,000 / mo',
    currency: 'USD',
    url: 'https://www.upwork.com',
    source: 'Upwork',
    source_code: 'UPW',
    cls: 'global',
    tags: ['Playable', 'PixiJS', 'Unity'],
    score: 95,
    contacts: 'lead_ad_studio@proton.me',
    pub_date: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
  },
  {
    external_id: 'seed_ru_3',
    title: 'Верстка интерактивного промо-сайта и мини-игры',
    description: 'Требуется фронтенд разработчик для создания интерактивной промо-страницы с мини-игрой на JS Canvas. Готовые макеты в Figma. TG: @frontend_lead_ru',
    budget: '45 000–60 000 ₽',
    currency: 'RUB',
    url: 'https://career.habr.com',
    source: 'Хабр Карьера',
    source_code: 'HB',
    cls: 'tg',
    tags: ['Interactive', 'Canvas', 'Figma'],
    score: 88,
    contacts: '@frontend_lead_ru',
    pub_date: new Date(Date.now() - 3600 * 1000 * 5).toISOString()
  },
  {
    external_id: 'seed_ru_4',
    title: 'Нужен рекламный HTML5 баннер с clickTag для DV360',
    description: 'Разработка трех адаптивных размеров рекламного баннера. Анимация, поддержка clickTag и строгий лимит веса архива до 150 КБ. Телефон/WhatsApp: +7 925 555-01-99',
    budget: '25 000–35 000 ₽',
    currency: 'RUB',
    url: 'https://www.fl.ru',
    source: 'FL.ru',
    source_code: 'FL',
    cls: 'tg',
    tags: ['Баннеры', 'clickTag', 'DV360'],
    score: 85,
    contacts: '+7 925 555-01-99',
    pub_date: new Date(Date.now() - 3600 * 1000 * 8).toISOString()
  }
];

async function runAllScrapers() {
  console.log('[Scraper Engine] Starting order search across Russian & Global sources...');
  
  const results = await Promise.allSettled([
    fetchHabrLeads(),
    fetchHeadHunterLeads(),
    fetchFreelancerLeads(),
    fetchTelegramLeads(),
    fetchRussianFreelanceLeads(),
    fetchGlobalLeads()
  ]);

  let allLeads = [];
  results.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allLeads.push(...res.value);
    }
  });

  console.log(`[Scraper Engine] Live scrapers retrieved ${allLeads.length} leads.`);

  allLeads.push(...SEED_LEADS);

  let newCount = 0;
  const now = new Date().toISOString();

  for (const lead of allLeads) {
    try {
      const existing = await get('SELECT id FROM leads WHERE url = ? OR external_id = ?', [lead.url, lead.external_id]);
      if (!existing) {
        const id = 'lead_' + Math.random().toString(36).substr(2, 9);
        await run(`
          INSERT INTO leads (id, external_id, title, description, budget, currency, url, source, source_code, cls, tags, score, pub_date, fetched_at, contacts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          lead.external_id || id,
          lead.title,
          lead.description,
          lead.budget || 'Договорная',
          lead.currency || 'RUB',
          lead.url,
          lead.source,
          lead.source_code,
          lead.cls,
          JSON.stringify(lead.tags || []),
          lead.score || 70,
          lead.pub_date || now,
          now,
          lead.contacts || ''
        ]);
        newCount++;
      }
    } catch (err) {
      // ignore duplicates
    }
  }

  await run(`
    INSERT INTO system_status (key, value, updated_at)
    VALUES ('last_scrape_at', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `, [now, now]);

  console.log(`[Scraper Engine] Finished search! Inserted ${newCount} new leads.`);
  
  const totalLeads = await all('SELECT COUNT(*) as cnt FROM leads');
  return {
    newCount,
    totalCount: totalLeads[0]?.cnt || 0,
    scrapedAt: now
  };
}

module.exports = {
  runAllScrapers,
  SEED_LEADS
};
