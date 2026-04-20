const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'hot-monitor.db');

let db = null;

async function getDb() {
  if (db) return db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hot_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      source TEXT,
      source_url TEXT,
      score REAL DEFAULT 0,
      domain TEXT,
      is_verified INTEGER DEFAULT 0,
      keyword_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (keyword_id) REFERENCES keywords(id)
    )
  `);

  ensureColumn('hot_topics', 'source_type', 'TEXT');
  ensureColumn('hot_topics', 'source_engine', 'TEXT');
  ensureColumn('hot_topics', 'source_domain', 'TEXT');
  ensureColumn('hot_topics', 'language', 'TEXT');
  ensureColumn('hot_topics', 'rule_score', 'REAL DEFAULT 0');
  ensureColumn('hot_topics', 'cross_source_count', 'INTEGER DEFAULT 1');

  // v2: engagement, author, AI reason, timestamps, multi-source details
  ensureColumn('hot_topics', 'ai_reason', 'TEXT');
  ensureColumn('hot_topics', 'summary_type', "TEXT DEFAULT 'original'");
  ensureColumn('hot_topics', 'published_at', 'TEXT');
  ensureColumn('hot_topics', 'author', 'TEXT');
  ensureColumn('hot_topics', 'author_name', 'TEXT');
  ensureColumn('hot_topics', 'author_followers', 'INTEGER DEFAULT 0');
  ensureColumn('hot_topics', 'likes', 'INTEGER DEFAULT 0');
  ensureColumn('hot_topics', 'retweets', 'INTEGER DEFAULT 0');
  ensureColumn('hot_topics', 'replies', 'INTEGER DEFAULT 0');
  ensureColumn('hot_topics', 'views', 'INTEGER DEFAULT 0');
  ensureColumn('hot_topics', 'source_engines', 'TEXT');
  ensureColumn('hot_topics', 'source_domains', 'TEXT');

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER,
      type TEXT,
      channel TEXT,
      title TEXT,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      sent_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (topic_id) REFERENCES hot_topics(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  saveDb();
  return db;
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const pragma = db.exec(`PRAGMA table_info(${tableName})`);
  const rows = pragma.length > 0 ? pragma[0].values : [];
  const existing = new Set(rows.map((row) => row[1]));
  if (!existing.has(columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  if (params.length) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  const changes = db.getRowsModified();
  // Get last insert rowid using exec to avoid prepared statement issues
  const result = db.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 0;
  saveDb();
  return { changes, lastId };
}

module.exports = { getDb, saveDb, queryAll, queryOne, runSql };
