const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'leadplay.db');

// Ensure data folder exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDB() {
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      external_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      budget TEXT,
      currency TEXT,
      url TEXT UNIQUE,
      source TEXT NOT NULL,
      source_code TEXT NOT NULL,
      cls TEXT NOT NULL,
      tags TEXT,
      score INTEGER DEFAULT 0,
      pub_date TEXT,
      fetched_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      telegram_id TEXT PRIMARY KEY,
      keywords TEXT,
      min_score INTEGER DEFAULT 70,
      max_days INTEGER DEFAULT 7,
      sources TEXT,
      updated_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS lead_states (
      telegram_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'saved',
      notes TEXT,
      updated_at TEXT,
      PRIMARY KEY (telegram_id, lead_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notified_leads (
      telegram_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      sent_at TEXT,
      PRIMARY KEY (telegram_id, lead_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS system_status (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `);

  // Default initial status
  await run(`
    INSERT OR IGNORE INTO system_status (key, value, updated_at)
    VALUES ('last_scrape_at', ?, ?)
  `, [new Date().toISOString(), new Date().toISOString()]);

  console.log('[DB] SQLite database initialized at', dbPath);
}

module.exports = {
  db,
  run,
  get,
  all,
  initDB
};
