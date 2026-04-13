const { api } = require('./lib');

const [,, action, ...args] = process.argv;

async function main() {
  switch (action) {
    case 'show': {
      const { data } = await api('/settings');
      console.log('=== 系统设置 ===');
      console.log('--- API 状态 ---');
      console.log(`OpenRouter: ${data.openrouter_configured ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`Twitter:    ${data.twitter_configured ? '✅ 已配置' : '❌ 未配置'}`);
      console.log('--- 邮件配置 ---');
      console.log(`SMTP服务器: ${data.smtp_host || '未设置'}`);
      console.log(`SMTP端口:   ${data.smtp_port || '465'}`);
      console.log(`发件邮箱:   ${data.smtp_user || '未设置'}`);
      console.log(`通知邮箱:   ${data.notify_email || '未设置'}`);
      break;
    }
    case 'set': {
      const key = args[0];
      const value = args.slice(1).join(' ');
      const allowed = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'notify_email',
                        'keyword_interval', 'hotspot_interval'];
      if (!key || !value) {
        console.error('用法: settings.js set <key> <value>');
        console.error(`可用key: ${allowed.join(', ')}`);
        process.exit(1);
      }
      if (!allowed.includes(key)) {
        console.error(`无效的key: ${key}`);
        console.error(`可用key: ${allowed.join(', ')}`);
        process.exit(1);
      }
      await api('/settings', { method: 'POST', body: { settings: { [key]: value } } });
      console.log(`✅ 已设置 ${key} = ${key.includes('pass') ? '****' : value}`);
      break;
    }
    default:
      console.log('用法: settings.js <show|set> [参数]');
      console.log('  show                 - 查看当前设置');
      console.log('  set <key> <value>    - 修改设置');
      console.log('  可用key: smtp_host, smtp_port, smtp_user, smtp_pass, notify_email');
  }
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
