/**
 * Relevance scoring engine for LeadPlay
 * Evaluates how strongly a lead matches Playable Ads / HTML5 Banner / Interactive Ads domain.
 */

const HIGH_PRIORITY_KEYWORDS = [
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
  'html5 баннеры'
];

const MEDIUM_PRIORITY_KEYWORDS = [
  'html5',
  'canvas',
  'webgl',
  'gsap',
  'pixijs',
  'phaser',
  'createjs',
  'cocos',
  'three.js',
  'rich media',
  'dv360',
  'doubleclick',
  'clicktag',
  'креативы',
  'мобильная реклама'
];

const GENERAL_DEV_KEYWORDS = [
  'banner',
  'баннер',
  'анимация',
  'мини-игра',
  'мини игра',
  'mini game',
  'game dev',
  'геймдев',
  'javascript',
  'js'
];

function calculateRelevanceScore(title = '', description = '', tags = []) {
  const fullText = (title + ' ' + description + ' ' + (Array.isArray(tags) ? tags.join(' ') : tags)).toLowerCase();
  
  let score = 50; // base score for candidate leads

  // High priority matching (+20 to +40 points)
  let highMatches = 0;
  HIGH_PRIORITY_KEYWORDS.forEach(kw => {
    if (fullText.includes(kw)) {
      highMatches++;
    }
  });

  if (highMatches > 0) {
    score += Math.min(40, 25 + highMatches * 5);
  }

  // Medium priority matching (+10 to +25 points)
  let mediumMatches = 0;
  MEDIUM_PRIORITY_KEYWORDS.forEach(kw => {
    if (fullText.includes(kw)) {
      mediumMatches++;
    }
  });

  if (mediumMatches > 0) {
    score += Math.min(25, 10 + mediumMatches * 4);
  }

  // General dev matching (+5 to +10 points)
  let generalMatches = 0;
  GENERAL_DEV_KEYWORDS.forEach(kw => {
    if (fullText.includes(kw)) {
      generalMatches++;
    }
  });

  if (generalMatches > 0) {
    score += Math.min(10, 5 + generalMatches * 2);
  }

  // Title emphasis bonus (+10 if high priority term is directly in title)
  const titleLower = title.toLowerCase();
  if (HIGH_PRIORITY_KEYWORDS.some(kw => titleLower.includes(kw))) {
    score += 10;
  }

  // Clamp score between 50 and 99
  return Math.min(99, Math.max(50, score));
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
  extractTags
};
