/**
 * Relevance scoring engine for LeadPlay
 * Evaluates how strongly a lead matches custom user keywords.
 */

function extractKeywordsList(keywordsStr = '') {
  if (!keywordsStr || !keywordsStr.trim()) return [];
  
  // Split by comma, semicolon, or newlines
  const rawList = keywordsStr.split(/[,;\n]+/);
  const keywords = [];

  rawList.forEach(item => {
    const trimmed = item.trim().toLowerCase();
    if (trimmed.length > 0) {
      keywords.push(trimmed);
      // Also add individual words if user typed multi-word phrases
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
    return 85; // Base high score when no filter keywords specified
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

/**
 * Checks if a lead matches ANY of the user's custom keywords
 */
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

module.exports = {
  calculateRelevanceScore,
  matchesAnyKeyword,
  extractTags
};
