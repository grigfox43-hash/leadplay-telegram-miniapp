const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leadplay.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
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
      external_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      budget TEXT,
      currency TEXT,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      source_code TEXT,
      cls TEXT,
      tags TEXT,
      score INTEGER DEFAULT 50,
      pub_date TEXT,
      fetched_at TEXT,
      contacts TEXT
    )
  `);

  // Ensure contacts column exists if table was created previously
  try {
    await run(`ALTER TABLE leads ADD COLUMN contacts TEXT`);
  } catch (e) {
    // Column already exists
  }

  await run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      telegram_id TEXT PRIMARY KEY,
      keywords TEXT,
      min_score INTEGER DEFAULT 65,
      max_days INTEGER DEFAULT 30,
      sources TEXT,
      updated_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS lead_states (
      telegram_id TEXT,
      lead_id TEXT,
      stage TEXT,
      notes TEXT,
      updated_at TEXT,
      PRIMARY KEY (telegram_id, lead_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notified_leads (
      telegram_id TEXT,
      lead_id TEXT,
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

  console.log('[Database] SQLite initialized successfully at data/leadplay.db');
}

module.exports = {
  db,
  initDB,
  run,
  get,
  all
};
