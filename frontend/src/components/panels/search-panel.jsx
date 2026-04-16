import { Search } from 'lucide-react';
import { ActionButton, LabeledInput, PanelShell, TopicList } from '../shared/ui-kit';
import { cn } from '../../lib/utils';

export function SearchPanel({
  searchQuery,
  setSearchQuery,
  searchSources,
  setSearchSources,
  executeSearch,
  busy,
  searchResults,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <PanelShell eyebrow="Verify" title="快速核验" description="适合临时验证一条消息是否值得继续跟进。">
        <div className="space-y-4">
          <LabeledInput
            label="搜索内容"
            placeholder="输入你想验证的热点、发布消息或趋势词"
            value={searchQuery}
            onChange={setSearchQuery}
            onEnter={executeSearch}
          />
          <div>
            <p className="mb-3 text-sm text-slate-400">数据源</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'web', label: '网页搜索' },
                { id: 'twitter', label: 'Twitter / X' },
              ].map((source) => {
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

          <ActionButton icon={Search} onClick={executeSearch} loading={busy.search}>
            搜索并执行 AI 验证
          </ActionButton>
        </div>
      </PanelShell>

      <PanelShell eyebrow="Results" title="验证结果" description="这里优先展示可继续扩展成内容的线索。">
        <TopicList items={searchResults} emptyTitle="等待你的检索" emptyDescription="输入一条消息，系统会从多源拉取结果并做 AI 验证。" />
      </PanelShell>
    </div>
  );
}