import { RefreshCcw, Sparkles } from 'lucide-react';
import { ActionButton, ChipField, LabeledInput, PanelShell, SecondaryButton, TopicList } from '../shared/ui-kit';

export function HotspotsPanel({
  domainInput,
  setDomainInput,
  addDomain,
  busy,
  triggerHotspotCollect,
  domains,
  toggleDomain,
  deleteDomain,
  domainFilter,
  setDomainFilter,
  hotTopics,
}) {
  return (
    <div id="hotspots-panel" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <PanelShell eyebrow="Radar" title="热点追踪领域" description="把你的关注面拆清楚，热点捕捉才会更准。">
        <div className="space-y-4">
          <LabeledInput
            label="新增领域"
            placeholder="例如：AI 编程、AI Agent、模型 API"
            value={domainInput}
            onChange={setDomainInput}
            onEnter={addDomain}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionButton icon={Sparkles} onClick={addDomain} loading={busy.addDomain}>
              添加领域
            </ActionButton>
            <SecondaryButton icon={RefreshCcw} onClick={triggerHotspotCollect} loading={busy.collect}>
              立即收集
            </SecondaryButton>
          </div>

          <ChipField
            items={domains}
            emptyText="先添加几个你真正会持续追的赛道。"
            renderLabel={(item) => item.name}
            onToggle={(item) => toggleDomain(item.id, item.enabled ? 0 : 1)}
            onDelete={(item) => deleteDomain(item.id)}
          />
        </div>
      </PanelShell>

      <PanelShell eyebrow="Signals" title="热点排序" description="这里是你做选题判断最核心的一屏。">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">按领域过滤，把精力集中到当前最值得追的方向。</p>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span>领域筛选</span>
            <select
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value)}
              className="bg-transparent text-white outline-none"
            >
              <option value="">全部</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.name} className="bg-slate-950">
                  {domain.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TopicList items={hotTopics} emptyTitle="还没有领域热点" emptyDescription="完成一次热点收集后，这里会出现按价值排序的话题。" />
      </PanelShell>
    </div>
  );
}