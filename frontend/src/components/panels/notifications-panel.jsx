import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { EmptyState, NotificationRow, PanelShell, SecondaryButton } from '../shared/ui-kit';

export function NotificationsPanel({ notifications, markAllRead, deleteAllNotifications }) {
  const displayList = notifications.slice(0, 100);

  return (
    <PanelShell
      eyebrow="Alerts"
      title="通知记录"
      description=""
      action={
        <div className="flex gap-2">
          <SecondaryButton icon={CheckCheck} onClick={markAllRead} small>
            全部已读
          </SecondaryButton>
          <SecondaryButton icon={Trash2} onClick={deleteAllNotifications} small>
            清空全部
          </SecondaryButton>
        </div>
      }
    >
      <div id="notifications-panel" className="space-y-3">
        {displayList.length ? (
          <>
            {displayList.map((item) => <NotificationRow key={item.id || item.sent_at} item={item} />)}
            {notifications.length > 100 && (
              <p className="text-center text-xs text-slate-500">仅展示最近 100 条，共 {notifications.length} 条</p>
            )}
          </>
        ) : (
          <EmptyState icon={Bell} title="暂无通知历史" description="" />
        )}
      </div>
    </PanelShell>
  );
}