require('dotenv').config();

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { getDb, queryAll, queryOne, runSql } = require('./src/db');
const { checkKeywords, getPendingNotifications } = require('./src/services/monitor');
const { collectHotTopics } = require('./src/services/hotspot');
const { searchWebMulti } = require('./src/services/search');
const { searchTweets, getTrends } = require('./src/services/twitter');
const { verifyResults, analyzeHotTopics } = require('./src/services/ai');
const { getSmtpConfig } = require('./src/services/email');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== Keywords API ====================

app.get('/api/keywords', (req, res) => {
  const rows = queryAll('SELECT * FROM keywords ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});

app.post('/api/keywords', (req, res) => {
  const { keyword } = req.body;
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ success: false, message: '关键词不能为空' });
  }
  const existing = queryOne('SELECT id FROM keywords WHERE keyword = ?', [keyword.trim()]);
  if (existing) {
    return res.status(409).json({ success: false, message: '关键词已存在' });
  }
  const { lastId } = runSql('INSERT INTO keywords (keyword) VALUES (?)', [keyword.trim()]);
  res.json({ success: true, data: { id: lastId, keyword: keyword.trim(), enabled: 1 } });
});

app.put('/api/keywords/:id', (req, res) => {
  const { enabled } = req.body;
  runSql('UPDATE keywords SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/keywords/:id', (req, res) => {
  runSql('DELETE FROM keywords WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// Manually trigger keyword check
app.post('/api/keywords/check', async (req, res) => {
  try {
    await checkKeywords();
    res.json({ success: true, message: '关键词检查完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== Domains API ====================

app.get('/api/domains', (req, res) => {
  const rows = queryAll('SELECT * FROM domains ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});

app.post('/api/domains', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '领域名不能为空' });
  }
  const existing = queryOne('SELECT id FROM domains WHERE name = ?', [name.trim()]);
  if (existing) {
    return res.status(409).json({ success: false, message: '领域已存在' });
  }
  const { lastId } = runSql('INSERT INTO domains (name) VALUES (?)', [name.trim()]);
  res.json({ success: true, data: { id: lastId, name: name.trim(), enabled: 1 } });
});

app.put('/api/domains/:id', (req, res) => {
  const { enabled } = req.body;
  runSql('UPDATE domains SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/domains/:id', (req, res) => {
  runSql('DELETE FROM domains WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

// Manually trigger hot topics collection
app.post('/api/domains/collect', async (req, res) => {
  try {
    await collectHotTopics();
    res.json({ success: true, message: '热点收集完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== Hot Topics API ====================

app.get('/api/topics', (req, res) => {
  const { domain, keyword, limit } = req.query;
  let sql = 'SELECT * FROM hot_topics WHERE 1=1';
  const params = [];

  if (domain) {
    sql += ' AND domain = ?';
    params.push(domain);
  }
  if (keyword) {
    sql += ' AND keyword_id IN (SELECT id FROM keywords WHERE keyword = ?)';
    params.push(keyword);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit) || 50);

  const rows = queryAll(sql, params);
  res.json({ success: true, data: rows });
});

// ==================== Notifications API ====================

app.get('/api/notifications', (req, res) => {
  const { unread } = req.query;
  let sql = 'SELECT * FROM notifications';
  if (unread === '1') sql += ' WHERE is_read = 0';
  sql += ' ORDER BY sent_at DESC LIMIT 100';
  const rows = queryAll(sql);
  res.json({ success: true, data: rows });
});

app.post('/api/notifications/read', (req, res) => {
  const { ids } = req.body;
  if (ids && ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    runSql(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`, ids.map(Number));
  } else {
    runSql('UPDATE notifications SET is_read = 1');
  }
  res.json({ success: true });
});

// SSE endpoint for real-time push
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendSSE = () => {
    const notifications = getPendingNotifications();
    if (notifications.length) {
      res.write(`data: ${JSON.stringify(notifications)}\n\n`);
    }
  };

  const interval = setInterval(sendSSE, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ==================== Settings API ====================

app.get('/api/settings', (req, res) => {
  const rows = queryAll('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  // Merge env defaults
  const smtp = getSmtpConfig();
  if (!settings.smtp_host && smtp.host) settings.smtp_host = smtp.host;
  if (!settings.smtp_port && smtp.port) settings.smtp_port = String(smtp.port);
  if (!settings.smtp_user && smtp.user) settings.smtp_user = smtp.user;
  if (!settings.notify_email && smtp.notifyEmail) settings.notify_email = smtp.notifyEmail;

  // Check API key status
  settings.openrouter_configured = !!process.env.OPENROUTER_API_KEY;
  settings.twitter_configured = !!process.env.TWITTER_API_KEY;

  res.json({ success: true, data: settings });
});

app.post('/api/settings', (req, res) => {
  const allowed = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'notify_email',
                    'keyword_interval', 'hotspot_interval'];
  const { settings } = req.body;

  for (const [key, value] of Object.entries(settings)) {
    if (!allowed.includes(key)) continue;
    const existing = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      runSql('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
    } else {
      runSql('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
  }

  res.json({ success: true });
});

// ==================== Quick Search API (manual) ====================

app.post('/api/search', async (req, res) => {
  const { query, sources } = req.body;
  if (!query) return res.status(400).json({ success: false, message: '搜索词不能为空' });

  try {
    const tasks = [];
    const enabledSources = sources || ['web', 'twitter'];

    if (enabledSources.includes('web')) {
      tasks.push(searchWebMulti(query, 10));
    }
    if (enabledSources.includes('twitter')) {
      tasks.push(searchTweets(query, 'Latest').then(d => d.tweets));
    }

    const results = await Promise.allSettled(tasks);
    const allResults = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Optionally verify with AI
    const verified = await verifyResults(query, allResults);

    res.json({ success: true, data: verified });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== Status API ====================

app.get('/api/status', (req, res) => {
  const keywordCount = queryOne('SELECT COUNT(*) as count FROM keywords WHERE enabled = 1');
  const domainCount = queryOne('SELECT COUNT(*) as count FROM domains WHERE enabled = 1');
  const topicCount = queryOne('SELECT COUNT(*) as count FROM hot_topics');
  const unreadCount = queryOne('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');

  res.json({
    success: true,
    data: {
      keywords: keywordCount?.count || 0,
      domains: domainCount?.count || 0,
      topics: topicCount?.count || 0,
      unread: unreadCount?.count || 0,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      twitter: !!process.env.TWITTER_API_KEY,
      uptime: process.uptime()
    }
  });
});

// ==================== Start Server ====================

async function start() {
  await getDb();
  console.log('Database initialized');

  // Schedule keyword check every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Running keyword check...');
    try { await checkKeywords(); } catch (e) { console.error('[Cron] Keyword check error:', e.message); }
  });

  // Schedule hot topics collection every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Running hot topics collection...');
    try { await collectHotTopics(); } catch (e) { console.error('[Cron] Hot topics error:', e.message); }
  });

  app.listen(PORT, () => {
    console.log(`🔥 Hot Monitor running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
