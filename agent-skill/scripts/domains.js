const { api } = require('./lib');

const [,, action, ...args] = process.argv;

async function main() {
  switch (action) {
    case 'list': {
      const { data } = await api('/domains');
      if (!data.length) {
        console.log('暂无追踪领域');
        return;
      }
      console.log('=== 追踪领域列表 ===');
      data.forEach(d => {
        const status = d.enabled ? '🟢 启用' : '⏸️  禁用';
        console.log(`  [ID:${d.id}] ${d.name}  ${status}`);
      });
      console.log(`共 ${data.length} 个领域`);
      break;
    }
    case 'add': {
      const name = args.join(' ').trim();
      if (!name) { console.error('用法: domains.js add <领域名>'); process.exit(1); }
      const res = await api('/domains', { method: 'POST', body: { name } });
      if (res.success) {
        console.log(`✅ 已添加领域: "${name}" (ID:${res.data.id})`);
      } else {
        console.log(`❌ ${res.message}`);
      }
      break;
    }
    case 'delete': {
      const id = Number(args[0]);
      if (!id) { console.error('用法: domains.js delete <ID>'); process.exit(1); }
      await api(`/domains/${id}`, { method: 'DELETE' });
      console.log(`✅ 已删除领域 ID:${id}`);
      break;
    }
    case 'toggle': {
      const id = Number(args[0]);
      const enabled = args[1] !== 'off';
      if (!id) { console.error('用法: domains.js toggle <ID> [on|off]'); process.exit(1); }
      await api(`/domains/${id}`, { method: 'PUT', body: { enabled } });
      console.log(`✅ 领域 ID:${id} 已${enabled ? '启用' : '禁用'}`);
      break;
    }
    default:
      console.log('用法: domains.js <list|add|delete|toggle> [参数]');
      console.log('  list              - 列出所有领域');
      console.log('  add <领域名>      - 添加领域');
      console.log('  delete <ID>       - 删除领域');
      console.log('  toggle <ID> [on|off] - 启用/禁用领域');
  }
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
