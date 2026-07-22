/**
 * Relevance scoring and comprehensive contact extraction engine for LeadPlay
 */

function extractKeywordsList(keywordsStr = '') {
  if (!keywordsStr || !keywordsStr.trim()) return [];
  
  const rawList = keywordsStr.split(/[,;\n]+/);
  const keywords = [];

  rawList.forEach(item => {
    const trimmed = item.trim().toLowerCase();
    if (trimmed.length > 0) {
      keywords.push(trimmed);
      const words = trimmed.split(/\s+/).filter(w => w.length > 2);
      words.forEach(w => {
        if (!keywords.includes(w)) keywords.push(w);
      });
    }
  });

  return keywords;
}

function calculateRelevanceScore(title = '', description = '', tags = [], customKeywordsStr = '') {
  const fullText = (title + ' ' + description + ' ' + (Array.isArray(tags) ? tags.join(' ') : tags)).toLowerCase();
  const userKeywords = extractKeywordsList(customKeywordsStr);

  if (userKeywords.length === 0) {
    return 85;
  }

  let matchesCount = 0;
  userKeywords.forEach(kw => {
    if (fullText.includes(kw)) {
      matchesCount++;
    }
  });

  if (matchesCount > 0) {
    return Math.min(99, 70 + matchesCount * 10);
  }

  return 50;
}

function matchesAnyKeyword(title = '', description = '', tags = [], keywordsStr = '') {
  const userKeywords = extractKeywordsList(keywordsStr);
  if (userKeywords.length === 0) return true;

  const fullText = (title + ' ' + description + ' ' + (Array.isArray(tags) ? tags.join(' ') : tags)).toLowerCase();
  
  return userKeywords.some(kw => fullText.includes(kw));
}

function extractTags(text = '') {
  const tagsSet = new Set();
  const lower = text.toLowerCase();

  if (lower.includes('playable')) tagsSet.add('Playable');
  if (lower.includes('html5')) tagsSet.add('HTML5');
  if (lower.includes('banner') || lower.includes('баннер')) tagsSet.add('Banner');
  if (lower.includes('canvas')) tagsSet.add('Canvas');
  if (lower.includes('webgl')) tagsSet.add('WebGL');
  if (lower.includes('gsap')) tagsSet.add('GSAP');
  if (lower.includes('game') || lower.includes('игра')) tagsSet.add('GameDev');
  if (lower.includes('interactive') || lower.includes('интерактив')) tagsSet.add('Interactive');

  if (tagsSet.size === 0) {
    tagsSet.add('Freelance');
  }

  return Array.from(tagsSet);
}

/**
 * Comprehensive contact extractor: Telegram, Email, Phone, WhatsApp, VK, Skype
 */
function extractContacts(text = '') {
  if (!text) return '';
  const contacts = new Set();

  // Telegram handles (@username)
  const tgMatches = text.match(/(?:^|[\s,.:;()\/])(@[a-zA-Z0-9_]{4,32})/g);
  if (tgMatches) {
    tgMatches.forEach(m => {
      const handle = m.trim().replace(/^[\s,.:;()\/]+/, '');
      const lower = handle.toLowerCase();
      if (!lower.includes('@freelance') && !lower.includes('@gamedev') && !lower.includes('@webdev') && !lower.includes('@remote') && !lower.includes('@normjob') && !lower.includes('@it_job') && !lower.includes('@findervc')) {
        contacts.add(handle);
      }
    });
  }

  // Telegram links (t.me/username or telegram.me/username)
  const tmeMatches = text.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{4,32})/gi);
  if (tmeMatches) {
    tmeMatches.forEach(m => {
      const username = '@' + m.split('/').pop();
      const lower = username.toLowerCase();
      if (!lower.includes('@freelance') && !lower.includes('@gamedev') && !lower.includes('@webdev') && !lower.includes('@remote')) {
        contacts.add(username);
      }
    });
  }

  // Email addresses
  const emailMatches = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
  if (emailMatches) {
    emailMatches.forEach(e => contacts.add(e.trim()));
  }

  // Phone numbers (RU, CIS, International)
  const phoneMatches = text.match(/(\+?[7831]\d{1,3}[\s\-\.]?\(?\d{2,4}\)?[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{0,4})/g);
  if (phoneMatches) {
    phoneMatches.forEach(p => {
      const clean = p.trim();
      if (clean.replace(/\D/g, '').length >= 10) {
        contacts.add(clean);
      }
    });
  }

  // WhatsApp / Skype / VK links
  const waMatches = text.match(/(?:wa\.me|whatsapp|vk\.com)\/([a-zA-Z0-9_.-]+)/gi);
  if (waMatches) {
    waMatches.forEach(m => contacts.add(m.trim()));
  }

  return Array.from(contacts).join(' · ');
}

module.exports = {
  calculateRelevanceScore,
  matchesAnyKeyword,
  extractTags,
  extractContacts
};
