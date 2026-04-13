const { api, timeAgo } = require('./lib');

const [,, action, ...args] = process.argv;

async function main() {
  switch (action) {
    case 'list': {
      const { data } = await api('/notifications');
      printNotifications(data, '所有通知');
      break;
    }
    case 'unread': {
      const { data } = await api('/notifications?unread=1');
      printNotifications(data, '未读通知');
      break;
    }
    case 'read-all': {
      await api('/notifications/read', { method: 'POST', body: {} });
      console.log('✅ 已全部标为已读');
      break;
    }
    case 'read': {
      const ids = args.map(Number).filter(Boolean);
      if (!ids.length) { console.error('用法: notifications.js read <ID1> [ID2] ...'); process.exit(1); }
      await api('/notifications/read', { method: 'POST', body: { ids } });
      console.log(`✅ 已标记 ${ids.length} 条通知为已读`);
      break;
    }
    default:
      console.log('用法: notifications.js <list|unread|read-all|read> [参数]');
      console.log('  list        - 查看所有通知');
      console.log('  unread      - 查看未读通知');
      console.log('  read-all    - 全部标为已读');
      console.log('  read <IDs>  - 标记指定通知为已读');
  }
}

function printNotifications(data, title) {
  if (!data.length) {
    console.log(`暂无${title}`);
    return;
  }
  console.log(`=== ${title} (${data.length}条) ===`);
  console.log('');
  data.forEach(n => {
    const icon = n.type === 'keyword_hit' ? '🎯' : '📊';
    const unread = n.is_read ? '' : ' [未读]';
    console.log(`${icon} [ID:${n.id}]${unread} ${n.title}`);
    if (n.content) console.log(`   ${n.content}`);
    console.log(`   ${timeAgo(n.sent_at)}`);
    console.log('');
  });
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
