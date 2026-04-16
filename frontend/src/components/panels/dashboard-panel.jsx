import { Activity, Cpu, Gauge, RefreshCcw, Server } from 'lucide-react';
import { PanelShell, SecondaryButton, StatusCard, TopicList } from '../shared/ui-kit';
import { cn } from '../../lib/utils';
import { timeAgo } from '../../lib/format';

export function DashboardPanel({ recentTopics, logs, refreshOverview, busy, status }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
      <PanelShell
        eyebrow="Flow"
        title="最新热点流"
        description="把最新命中的内容和整理后的热点放在一个连续信息流里。"
        action={
          <SecondaryButton icon={RefreshCcw} onClick={refreshOverview} loading={busy.refresh} small>
            刷新
          </SecondaryButton>
        }
      >
        <TopicList items={recentTopics} emptyTitle="还没有热点数据" emptyDescription="先触发一次收集，或者等待定时任务运行。" />
      </PanelShell>

      <div className="grid gap-6">
        <PanelShell eyebrow="Mission" title="运转状态" description="这块区域保留你做内容判断最需要的即时状态。">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusCard icon={Activity} label="服务状态" value="在线" helper="Express 与 SSE 正常工作" />
            <StatusCard icon={Cpu} label="AI 验证" value={status.openrouter ? '已接入' : '未配置'} helper="控制真假识别与热点摘要" />
            <StatusCard icon={Server} label="Twitter 数据" value={status.twitter ? '已接入' : '未配置'} helper="影响趋势与实时性覆盖" />
            <StatusCard icon={Gauge} label="当前节奏" value="高频追踪" helper="关键词 10 分钟，领域 30 分钟" />
          </div>
        </PanelShell>

        <PanelShell eyebrow="Console" title="操作日志" description="只保留最近关键动作和推送事件，方便快速回顾。">
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
    </div>
  );
}