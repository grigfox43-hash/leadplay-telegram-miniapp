/**
 * Relevance scoring engine for LeadPlay
 * Evaluates how strongly a lead matches custom user keywords & Playable Ads / HTML5 domain.
 */

const DEFAULT_KEYWORDS = [
  'playable',
  'playable ad',
  'playable ads',
  'плейабл',
  'плейаблы',
  'интерактивная реклама',
  'interactive ad',
  'interactive ads',
  'html5 banner',
  'html5-баннер',
  'html5 баннер',
  'html5 баннеры',
  'html5',
  'canvas',
  'webgl',
  'gsap',
  'pixijs',
  'phaser',
  ' mini game',
  'мини-игра'
];

function calculateRelevanceScore(title = '', description = '', tags = [], customKeywordsStr = '') {
  const fullText = (title + ' ' + description + ' ' + (Array.isArray(tags) ? tags.join(' ') : tags)).toLowerCase();
  
  let score = 50;

  // Extract custom user keywords if provided (split by comma or newline)
  let userKeywords = [];
  if (customKeywordsStr && customKeywordsStr.trim()) {
    userKeywords = customKeywordsStr
      .split(/[,;\n]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 1);
  }

  const activeKeywords = userKeywords.length > 0 ? userKeywords : DEFAULT_KEYWORDS;

  let matchesCount = 0;
  activeKeywords.forEach(kw => {
    if (fullText.includes(kw)) {
      matchesCount++;
    }
  });

  if (matchesCount > 0) {
    score += Math.min(45, 20 + matchesCount * 10);
  }

  // Bonus for match in title
  const titleLower = title.toLowerCase();
  if (activeKeywords.some(kw => titleLower.includes(kw))) {
    score += 10;
  }

  return Math.min(99, Math.max(50, score));
}

/**
 * Checks if a lead matches ANY of the user's custom keywords
 */
function matchesAnyKeyword(title = '', description = '', tags = [], keywordsStr = '') {
  if (!keywordsStr || !keywordsStr.trim()) return true;

  const fullText = (title + ' ' + description + ' ' + (Array.isArray(tags) ? tags.join(' ') : tags)).toLowerCase();
  const list = keywordsStr.split(/[,;\n]+/).map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

  if (list.length === 0) return true;

  return list.some(kw => fullText.includes(kw));
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

module.exports = {
  calculateRelevanceScore,
  matchesAnyKeyword,
  extractTags
};
