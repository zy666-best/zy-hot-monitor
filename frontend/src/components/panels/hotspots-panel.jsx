import { RefreshCcw, Sparkles } from 'lucide-react';
import { ActionButton, ChipField, LabeledInput, PanelShell, SecondaryButton, TopicList } from '../shared/ui-kit';
import { useTopicFilters, TopicFilterBar, SelectFilter } from '../shared/topic-filters';

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
  const filters = useTopicFilters(hotTopics);

  /* domain select as extra control */
  const domainSelect = (
    <SelectFilter
      label="领域"
      value={domainFilter}
      onChange={setDomainFilter}
      options={[{ id: '', label: '全部' }, ...domains.map((d) => ({ id: d.name, label: d.name }))]}
    />
  );

  return (
    <div id="hotspots-panel" className="space-y-6">
      <PanelShell eyebrow="Radar" title="热点追踪领域" description="">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <LabeledInput
              label="新增领域"
              placeholder="例如：AI 编程、AI Agent、模型 API"
              value={domainInput}
              onChange={setDomainInput}
              onEnter={addDomain}
            />
          </div>
          <div className="flex shrink-0 gap-3">
            <ActionButton icon={Sparkles} onClick={addDomain} loading={busy.addDomain}>
              添加领域
            </ActionButton>
            <SecondaryButton icon={RefreshCcw} onClick={triggerHotspotCollect} loading={busy.collect}>
              立即收集
            </SecondaryButton>
          </div>
        </div>
        <div className="mt-4">
          <ChipField
            items={domains}
            emptyText="暂无追踪领域"
            renderLabel={(item) => item.name}
            onToggle={(item) => toggleDomain(item.id, item.enabled ? 0 : 1)}
            onDelete={(item) => deleteDomain(item.id)}
          />
        </div>
      </PanelShell>

      <PanelShell eyebrow="Signals" title="热点排序" description="">
        <TopicFilterBar filters={filters} total={hotTopics.length} extraControls={domainSelect} />
        <TopicList items={filters.filtered} emptyTitle="还没有领域热点" emptyDescription="完成一次热点收集后，这里会出现按价值排序的话题。" highlightKeyword={domainFilter} />
      </PanelShell>
    </div>
  );
}
