const { api } = require('./lib');

const query = process.argv.slice(2).join(' ').trim();

async function main() {
  if (!query) {
    console.error('用法: search.js <搜索内容>');
    console.error('示例: search.js "Claude 4 发布日期"');
    process.exit(1);
  }

  console.log(`🔍 搜索中: "${query}" (AI验证中，请稍候...)`);
  console.log('');

  const res = await api('/search', { method: 'POST', body: { query } });

  if (!res.success) {
    console.error(`搜索失败: ${res.message}`);
    process.exit(1);
  }

  const results = res.data;
  if (!results.length) {
    console.log('未找到经AI验证的相关结果');
    return;
  }

  console.log(`=== 搜索结果 (${results.length}条，已AI验证) ===`);
  console.log('');

  results.forEach((r, i) => {
    const confidence = r.ai_confidence ? `[置信度:${Math.round(r.ai_confidence * 100)}%]` : '';
    console.log(`${i + 1}. ${confidence} ${r.title}`);
    if (r.text || r.summary) console.log(`   ${(r.text || r.summary).substring(0, 200)}`);
    const meta = [];
    if (r.source) meta.push(`来源:${r.source}`);
    if (r.url) meta.push(r.url);
    if (r.ai_reason) meta.push(`AI判断:${r.ai_reason}`);
    console.log(`   ${meta.join(' | ')}`);
    console.log('');
  });
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
