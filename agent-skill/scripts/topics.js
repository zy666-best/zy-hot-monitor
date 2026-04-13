const { api, timeAgo } = require('./lib');

const args = process.argv.slice(2);

async function main() {
  const params = new URLSearchParams();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' && args[i + 1]) {
      params.set('domain', args[++i]);
    } else if (args[i] === '--keyword' && args[i + 1]) {
      params.set('keyword', args[++i]);
    } else if (args[i] === '--limit' && args[i + 1]) {
      params.set('limit', args[++i]);
    }
  }

  if (!params.has('limit')) params.set('limit', '20');

  const { data } = await api(`/topics?${params}`);

  if (!data.length) {
    console.log('暂无热点话题');
    return;
  }

  const domain = params.get('domain');
  const keyword = params.get('keyword');
  let header = '=== 🔥 热点话题 ===';
  if (domain) header += ` [领域: ${domain}]`;
  if (keyword) header += ` [关键词: ${keyword}]`;
  console.log(header);
  console.log('');

  data.forEach((t, i) => {
    const score = t.score > 0 ? `[🔥${Math.round(t.score)}]` : '';
    console.log(`${i + 1}. ${score} ${t.title}`);
    if (t.summary) console.log(`   ${t.summary.substring(0, 150)}`);
    const meta = [];
    if (t.source) meta.push(`来源:${t.source}`);
    if (t.domain) meta.push(`领域:${t.domain}`);
    if (t.source_url) meta.push(t.source_url);
    meta.push(timeAgo(t.created_at));
    console.log(`   ${meta.join(' | ')}`);
    console.log('');
  });

  console.log(`共 ${data.length} 条热点`);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
