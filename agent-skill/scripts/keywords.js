const { api } = require('./lib');

const [,, action, ...args] = process.argv;

async function main() {
  switch (action) {
    case 'list': {
      const { data } = await api('/keywords');
      if (!data.length) {
        console.log('暂无监控关键词');
        return;
      }
      console.log('=== 监控关键词列表 ===');
      data.forEach(k => {
        const status = k.enabled ? '🟢 启用' : '⏸️  禁用';
        console.log(`  [ID:${k.id}] ${k.keyword}  ${status}`);
      });
      console.log(`共 ${data.length} 个关键词`);
      break;
    }
    case 'add': {
      const keyword = args.join(' ').trim();
      if (!keyword) { console.error('用法: keywords.js add <关键词>'); process.exit(1); }
      const res = await api('/keywords', { method: 'POST', body: { keyword } });
      if (res.success) {
        console.log(`✅ 已添加关键词: "${keyword}" (ID:${res.data.id})`);
      } else {
        console.log(`❌ ${res.message}`);
      }
      break;
    }
    case 'delete': {
      const id = Number(args[0]);
      if (!id) { console.error('用法: keywords.js delete <ID>'); process.exit(1); }
      await api(`/keywords/${id}`, { method: 'DELETE' });
      console.log(`✅ 已删除关键词 ID:${id}`);
      break;
    }
    case 'toggle': {
      const id = Number(args[0]);
      const enabled = args[1] !== 'off';
      if (!id) { console.error('用法: keywords.js toggle <ID> [on|off]'); process.exit(1); }
      await api(`/keywords/${id}`, { method: 'PUT', body: { enabled } });
      console.log(`✅ 关键词 ID:${id} 已${enabled ? '启用' : '禁用'}`);
      break;
    }
    default:
      console.log('用法: keywords.js <list|add|delete|toggle> [参数]');
      console.log('  list              - 列出所有关键词');
      console.log('  add <关键词>      - 添加关键词');
      console.log('  delete <ID>       - 删除关键词');
      console.log('  toggle <ID> [on|off] - 启用/禁用关键词');
  }
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
