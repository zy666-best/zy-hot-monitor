import { Bell, CheckCheck, Cpu, Flame, Globe, RefreshCcw, Timer } from 'lucide-react';
import { formatUptime } from '../../lib/format';
import { cn } from '../../lib/utils';
import { EmptyState, NotificationRow } from '../shared/ui-kit';

export function HeaderBar({
  notifRef,
  status,
  unreadNotifications,
  notifOpen,
  setNotifOpen,
  refreshOverview,
  markAllRead,
  busy,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/65 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 shadow-[0_0_50px_rgba(108,247,214,0.16)]">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">Hot Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3" ref={notifRef}>
          {/* Status pills */}
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(108,247,214,0.8)]" />
              运行 {formatUptime(status.uptime || 0)}
            </div>
            <div className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs',
              status.openrouter
                ? 'border-violet-300/15 bg-violet-300/10 text-violet-100'
                : 'border-white/10 bg-white/5 text-slate-400',
            )}>
              <Cpu className="h-3 w-3" />
              AI {status.openrouter ? '在线' : '离线'}
            </div>
            <div className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs',
              status.twitter
                ? 'border-sky-300/15 bg-sky-300/10 text-sky-100'
                : 'border-white/10 bg-white/5 text-slate-400',
            )}>
              <Globe className="h-3 w-3" />
              Twitter {status.twitter ? '在线' : '离线'}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <Timer className="h-3 w-3" />
              10 / 30 min
            </div>
          </div>

          <button
            type="button"
            onClick={refreshOverview}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/10"
            aria-label="刷新面板"
          >
            <RefreshCcw className={cn('h-4 w-4', busy.refresh && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={() => setNotifOpen((current) => !current)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-sky-300/30 hover:bg-sky-300/10"
            aria-label="打开通知中心"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications.length ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-950">
                {unreadNotifications.length}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <div className="absolute right-4 top-16 w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-display text-base text-white">通知中心</p>
                  <p className="text-sm text-slate-400">最近的高优先级提醒都在这里。</p>
                </div>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:border-emerald-300/30 hover:text-emerald-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  全部已读
                </button>
              </div>

              <div className="space-y-2">
                {unreadNotifications.length ? (
                  unreadNotifications.slice(0, 6).map((item) => (
                    <NotificationRow key={item.id || item.sent_at} item={item} compact />
                  ))
                ) : (
                  <EmptyState icon={Bell} title="暂无未读提醒" description="新命中、新热点会第一时间推送到这里。" />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}