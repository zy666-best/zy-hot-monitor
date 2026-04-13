const { api } = require('./lib');

async function main() {
  const { data } = await api('/status');
  console.log('=== 🔥 热点监控系统状态 ===');
  console.log(`监控关键词: ${data.keywords} 个`);
  console.log(`追踪领域:   ${data.domains} 个`);
  console.log(`发现热点:   ${data.topics} 条`);
  console.log(`未读通知:   ${data.unread} 条`);
  console.log(`运行时间:   ${Math.floor(data.uptime / 60)} 分钟`);
  console.log('--- API 配置 ---');
  console.log(`OpenRouter: ${data.openrouter ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`Twitter:    ${data.twitter ? '✅ 已配置' : '❌ 未配置'}`);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
