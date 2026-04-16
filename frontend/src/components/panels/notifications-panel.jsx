import { Bell, CheckCheck } from 'lucide-react';
import { EmptyState, NotificationRow, PanelShell, SecondaryButton } from '../shared/ui-kit';

export function NotificationsPanel({ notifications, markAllRead }) {
  return (
    <PanelShell
      eyebrow="Alerts"
      title="通知记录"
      description="浏览器通知和邮件通知的历史会集中在这里。"
      action={
        <SecondaryButton icon={CheckCheck} onClick={markAllRead} small>
          全部已读
        </SecondaryButton>
      }
    >
      <div id="notifications-panel" className="space-y-3">
        {notifications.length ? (
          notifications.map((item) => <NotificationRow key={item.id || item.sent_at} item={item} />)
        ) : (
          <EmptyState icon={Bell} title="暂无通知历史" description="一旦有关键词命中或新热点，这里会自动生成记录。" />
        )}
      </div>
    </PanelShell>
  );
}