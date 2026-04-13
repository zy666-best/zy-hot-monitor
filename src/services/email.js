const nodemailer = require('nodemailer');
const { queryOne } = require('../db');

function getSmtpConfig() {
  // Try env vars first, then DB settings
  let host = process.env.SMTP_HOST;
  let port = process.env.SMTP_PORT;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let notifyEmail = process.env.NOTIFY_EMAIL;

  try {
    const dbHost = queryOne("SELECT value FROM settings WHERE key = 'smtp_host'");
    const dbPort = queryOne("SELECT value FROM settings WHERE key = 'smtp_port'");
    const dbUser = queryOne("SELECT value FROM settings WHERE key = 'smtp_user'");
    const dbPass = queryOne("SELECT value FROM settings WHERE key = 'smtp_pass'");
    const dbNotify = queryOne("SELECT value FROM settings WHERE key = 'notify_email'");

    host = dbHost?.value || host;
    port = dbPort?.value || port;
    user = dbUser?.value || user;
    pass = dbPass?.value || pass;
    notifyEmail = dbNotify?.value || notifyEmail;
  } catch {}

  return { host, port: Number(port) || 465, user, pass, notifyEmail };
}

async function sendEmail(subject, htmlContent) {
  const config = getSmtpConfig();

  if (!config.host || !config.user || !config.pass || !config.notifyEmail) {
    console.warn('Email not configured, skipping notification');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    await transporter.sendMail({
      from: `"热点监控" <${config.user}>`,
      to: config.notifyEmail,
      subject: `🔥 ${subject}`,
      html: htmlContent
    });

    console.log(`Email sent: ${subject}`);
    return true;
  } catch (err) {
    console.error('Send email error:', err.message);
    return false;
  }
}

/**
 * Send notification for keyword hit
 */
async function notifyKeywordHit(keyword, topics) {
  const subject = `关键词命中: "${keyword}" - 发现 ${topics.length} 条相关内容`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6b6b;">🔔 关键词监控提醒</h2>
      <p>您监控的关键词 <strong>"${keyword}"</strong> 有新的相关内容：</p>
      ${topics.map(t => `
        <div style="border-left: 3px solid #4ecdc4; padding: 10px; margin: 10px 0; background: #f8f9fa;">
          <h3 style="margin: 0 0 5px;"><a href="${t.url || '#'}" style="color: #2d3436;">${t.title}</a></h3>
          <p style="margin: 0; color: #636e72; font-size: 14px;">${t.summary || t.text || ''}</p>
          <small style="color: #b2bec3;">来源: ${t.source} | 置信度: ${Math.round((t.ai_confidence || 0) * 100)}%</small>
        </div>
      `).join('')}
      <p style="color: #b2bec3; font-size: 12px;">— 热点监控系统</p>
    </div>
  `;
  return sendEmail(subject, html);
}

/**
 * Send notification for hot topics digest
 */
async function notifyHotTopics(domain, topics) {
  const subject = `热点速递: "${domain}" - ${topics.length} 条热点`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6c5ce7;">📊 热点速递</h2>
      <p>领域 <strong>"${domain}"</strong> 的最新热点：</p>
      ${topics.map((t, i) => `
        <div style="border-left: 3px solid #a29bfe; padding: 10px; margin: 10px 0; background: #f8f9fa;">
          <h3 style="margin: 0 0 5px;">
            <span style="color: #fd79a8;">#${i + 1}</span> ${t.title}
            <span style="float: right; color: #e17055; font-size: 14px;">🔥 ${t.score}</span>
          </h3>
          <p style="margin: 0; color: #636e72; font-size: 14px;">${t.summary || ''}</p>
        </div>
      `).join('')}
      <p style="color: #b2bec3; font-size: 12px;">— 热点监控系统</p>
    </div>
  `;
  return sendEmail(subject, html);
}

module.exports = { sendEmail, notifyKeywordHit, notifyHotTopics, getSmtpConfig };
