import { Search } from 'lucide-react';
import { ActionButton, LabeledInput, PanelShell, TopicList } from '../shared/ui-kit';
import { useTopicFilters, TopicFilterBar } from '../shared/topic-filters';
import { cn } from '../../lib/utils';
import { SEARCH_SOURCE_OPTIONS } from '../../App';

export function SearchPanel({
  searchQuery,
  setSearchQuery,
  searchSources,
  setSearchSources,
  executeSearch,
  busy,
  searchResults,
}) {
  const filters = useTopicFilters(searchResults);

  return (
    <div className="space-y-6">
      <PanelShell eyebrow="Verify" title="快速核验" description="">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <LabeledInput
              label="搜索内容"
              placeholder="输入你想验证的热点、发布消息或趋势词"
              value={searchQuery}
              onChange={setSearchQuery}
              onEnter={executeSearch}
            />
          </div>
          <div className="shrink-0">
            <ActionButton icon={Search} onClick={executeSearch} loading={busy.search}>
              搜索并验证
            </ActionButton>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-3 text-sm text-slate-400">数据源</p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_SOURCE_OPTIONS.map((source) => {
              const active = searchSources.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => {
                    setSearchSources((current) => {
                      const exists = current.includes(source.id);
                      if (exists && current.length > 1) {
                        return current.filter((item) => item !== source.id);
                      }
                      if (exists) return current;
                      return [...current, source.id];
                    });
                  }}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition',
                    active ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/5 text-slate-300',
                  )}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </div>
      </PanelShell>

      <PanelShell eyebrow="Results" title="验证结果" description="">
        <TopicFilterBar filters={filters} total={searchResults.length} />
        <TopicList items={filters.filtered} emptyTitle="等待你的检索" emptyDescription="输入一条消息，系统会从多源拉取结果并做 AI 验证。" highlightKeyword={searchQuery} />
      </PanelShell>
    </div>
  );
}