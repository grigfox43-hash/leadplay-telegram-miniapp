require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, all, get, run } = require('./db');
const { runAllScrapers } = require('./scrapers');
const { startContinuousMonitoring } = require('./cron');
const { matchesAnyKeyword, calculateRelevanceScore } = require('./scoring');
require('./bot'); // initialize Telegram bot if token is configured

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, assets)
app.use(express.static(path.join(__dirname, '..')));

/**
 * GET /api/leads
 * Retrieves leads filtered by query parameters: q, keywords, sources, days, score
 */
app.get('/api/leads', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    const customKeywords = req.query.keywords || '';
    const sourcesParam = req.query.sources ? req.query.sources.split(',') : [];
    const maxDays = parseInt(req.query.days || '30', 10);
    const minScore = parseInt(req.query.score || '0', 10);
    const telegramId = req.query.telegram_id || 'default_user';

    // If keywords passed, update user profile in DB
    if (customKeywords) {
      await run(`
        INSERT INTO user_profiles (telegram_id, keywords, min_score, max_days, sources, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET keywords = excluded.keywords, updated_at = excluded.updated_at
      `, [telegramId, customKeywords, minScore, maxDays, req.query.sources || '', new Date().toISOString()]);
    }

    const rows = await all('SELECT * FROM leads ORDER BY pub_date DESC');
    
    // Fetch all user states for both telegram_id and default_user
    const userStates = await all('SELECT lead_id, stage FROM lead_states WHERE telegram_id = ? OR telegram_id = "default_user"', [telegramId]);
    const stateMap = {};
    userStates.forEach(s => stateMap[s.lead_id] = s.stage);

    const now = Date.now();

    const filtered = rows.map(r => {
      const pubTime = new Date(r.pub_date).getTime();
      const ageDays = Math.max(0, Math.floor((now - pubTime) / (1000 * 60 * 60 * 24)));
      const tags = JSON.parse(r.tags || '[]');
      
      const score = customKeywords ? calculateRelevanceScore(r.title, r.description, tags, customKeywords) : r.score;

      return {
        ...r,
        score,
        age: ageDays,
        tags,
        stage: stateMap[r.id] || null
      };
    }).filter(j => {
      // Exclude hidden or rejected leads from feed
      if (j.stage === 'hidden' || j.stage === 'rejected') return false;
      // Source filter
      if (sourcesParam.length > 0 && !sourcesParam.includes(j.source)) return false;
      // Age filter
      if (j.age > maxDays) return false;
      // Score filter
      if (j.score < minScore) return false;
      // Check custom keywords (matches ANY keyword in user filter list)
      if (customKeywords && !matchesAnyKeyword(j.title, j.description, j.tags, customKeywords)) {
        return false;
      }
      // Search text query input
      if (q) {
        const text = (j.title + ' ' + j.description + ' ' + j.tags.join(' ')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    res.json({
      success: true,
      count: filtered.length,
      leads: filtered
    });
  } catch (err) {
    console.error('[API] /api/leads error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline
 * Fetch user funnel pipeline leads grouped by stage
 */
app.get('/api/pipeline', async (req, res) => {
  try {
    const telegramId = req.query.telegram_id || 'default_user';
    const states = await all(`
      SELECT ls.stage, ls.notes, ls.updated_at, l.*
      FROM lead_states ls
      JOIN leads l ON ls.lead_id = l.id
      WHERE (ls.telegram_id = ? OR ls.telegram_id = "default_user") AND ls.stage NOT IN ('hidden', 'rejected')
      ORDER BY ls.updated_at DESC
    `, [telegramId]);

    const pipeline = {
      saved: [],
      contacted: [],
      agreed: []
    };

    states.forEach(row => {
      const item = {
        ...row,
        tags: JSON.parse(row.tags || '[]')
      };
      if (pipeline[row.stage]) {
        pipeline[row.stage].push(item);
      } else {
        pipeline.saved.push(item);
      }
    });

    res.json({
      success: true,
      pipeline
    });
  } catch (err) {
    console.error('[API] /api/pipeline error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads/:id/stage
 * Toggle or set stage for a lead in funnel pipeline
 */
app.post('/api/leads/:id/stage', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { stage, telegram_id = 'default_user', notes = '' } = req.body;

    const now = new Date().toISOString();

    if (!stage) {
      await run('DELETE FROM lead_states WHERE (telegram_id = ? OR telegram_id = "default_user") AND lead_id = ?', [telegram_id, leadId]);
      return res.json({ success: true, stage: null });
    }

    // Save stage for user's telegram_id
    await run(`
      INSERT INTO lead_states (telegram_id, lead_id, stage, notes, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(telegram_id, lead_id) DO UPDATE SET stage = excluded.stage, notes = excluded.notes, updated_at = excluded.updated_at
    `, [telegram_id, leadId, stage, notes, now]);

    // If hiding, ALSO save for default_user to ensure global persistence across sessions
    if (stage === 'hidden' && telegram_id !== 'default_user') {
      await run(`
        INSERT INTO lead_states (telegram_id, lead_id, stage, notes, updated_at)
        VALUES ('default_user', ?, 'hidden', ?, ?)
        ON CONFLICT(telegram_id, lead_id) DO UPDATE SET stage = 'hidden', updated_at = excluded.updated_at
      `, [leadId, notes, now]);
    }

    res.json({ success: true, stage, lead_id: leadId });
  } catch (err) {
    console.error('[API] /api/leads/:id/stage error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/search/trigger
 * Manually trigger instant order scrape cycle
 */
app.post('/api/search/trigger', async (req, res) => {
  try {
    const result = await runAllScrapers();
    res.json({
      success: true,
      message: `Поиск завершён. Найдено новых заказов: ${result.newCount}`,
      ...result
    });
  } catch (err) {
    console.error('[API] /api/search/trigger error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/status
 * Monitoring system health and last run time
 */
app.get('/api/status', async (req, res) => {
  try {
    const statusRow = await get("SELECT value, updated_at FROM system_status WHERE key = 'last_scrape_at'");
    const totalRow = await get('SELECT COUNT(*) as count FROM leads');

    res.json({
      status: 'online',
      monitoring: 'active',
      last_scrape_at: statusRow ? statusRow.value : null,
      total_leads: totalRow ? totalRow.count : 0,
      server_time: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Boot server and start database
async function startServer() {
  await initDB();
  
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 LeadPlay Server running on http://localhost:${PORT}`);
    console.log(`====================================================`);
    
    startContinuousMonitoring();
  });
}

startServer();
