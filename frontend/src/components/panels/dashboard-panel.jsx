import { Activity, Cpu, Gauge, RefreshCcw, Server } from 'lucide-react';
import { PanelShell, SecondaryButton, StatusCard, TopicList } from '../shared/ui-kit';
import { useTopicFilters, TopicFilterBar } from '../shared/topic-filters';
import { cn } from '../../lib/utils';
import { timeAgo } from '../../lib/format';

export function DashboardPanel({ recentTopics, logs, refreshOverview, busy, status }) {
  const filters = useTopicFilters(recentTopics);

  return (
    <div className="space-y-6">
      {/* status + log row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <PanelShell eyebrow="Mission" title="运转状态" description=""
          action={
            <SecondaryButton icon={RefreshCcw} onClick={refreshOverview} loading={busy.refresh} small>
              刷新
            </SecondaryButton>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard icon={Activity} label="服务状态" value="在线" helper="" />
            <StatusCard icon={Cpu} label="AI 验证" value={status.openrouter ? '已接入' : '未配置'} helper="" />
            <StatusCard icon={Server} label="Twitter" value={status.twitter ? '已接入' : '未配置'} helper="" />
            <StatusCard icon={Gauge} label="巡检节奏" value="关键词 10min / 领域 30min" helper="" />
          </div>
        </PanelShell>

        <PanelShell eyebrow="Console" title="操作日志" description="">
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <p className={cn('leading-6', log.type === 'error' ? 'text-rose-200' : log.type === 'success' ? 'text-emerald-100' : 'text-slate-200')}>
                    {log.text}
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">{timeAgo(log.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelShell>
      </div>

      {/* topic stream */}
      <PanelShell
        eyebrow="Flow"
        title="最新热点流"
        description=""
      >
        <TopicFilterBar filters={filters} total={recentTopics.length} />
        <TopicList items={filters.filtered} emptyTitle="还没有热点数据" emptyDescription="先触发一次收集，或者等待定时任务运行。" />
      </PanelShell>
    </div>
  );
}