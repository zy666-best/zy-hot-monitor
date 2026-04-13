const { api } = require('./lib');

const [,, target] = process.argv;

async function main() {
  switch (target) {
    case 'keywords': {
      console.log('⚡ 正在检查所有启用的关键词...');
      const res = await api('/keywords/check', { method: 'POST' });
      console.log(res.success ? '✅ 关键词检查完成' : `❌ ${res.message}`);
      break;
    }
    case 'hotspots': {
      console.log('⚡ 正在收集所有启用领域的热点...');
      const res = await api('/domains/collect', { method: 'POST' });
      console.log(res.success ? '✅ 热点收集完成' : `❌ ${res.message}`);
      break;
    }
    default:
      console.log('用法: trigger.js <keywords|hotspots>');
      console.log('  keywords  - 立即检查所有启用的关键词');
      console.log('  hotspots  - 立即收集所有启用领域的热点');
  }
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
