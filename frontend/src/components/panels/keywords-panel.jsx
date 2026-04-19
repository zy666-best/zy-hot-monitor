import { Radar, Sparkles } from 'lucide-react';
import { ActionButton, ChipField, LabeledInput, PanelShell, SecondaryButton, TopicList } from '../shared/ui-kit';
import { useTopicFilters, TopicFilterBar } from '../shared/topic-filters';

export function KeywordsPanel({
  keywordInput,
  setKeywordInput,
  addKeyword,
  busy,
  triggerKeywordCheck,
  keywords,
  toggleKeyword,
  deleteKeyword,
  keywordTopics,
}) {
  const filters = useTopicFilters(keywordTopics);

  return (
    <div id="keywords-panel" className="space-y-6">
      <PanelShell eyebrow="Monitor" title="关键词监控" description="">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <LabeledInput
              label="新增关键词"
              placeholder="例如：GPT-5、Claude Code、OpenAI 发布会"
              value={keywordInput}
              onChange={setKeywordInput}
              onEnter={addKeyword}
            />
          </div>
          <div className="flex shrink-0 gap-3">
            <ActionButton icon={Sparkles} onClick={addKeyword} loading={busy.addKeyword}>
              添加关键词
            </ActionButton>
            <SecondaryButton icon={Radar} onClick={triggerKeywordCheck} loading={busy.keywordCheck}>
              立即检查
            </SecondaryButton>
          </div>
        </div>
        <div className="mt-4">
          <ChipField
            items={keywords}
            emptyText="暂无监控词"
            renderLabel={(item) => item.keyword}
            onToggle={(item) => toggleKeyword(item.id, item.enabled ? 0 : 1)}
            onDelete={(item) => deleteKeyword(item.id)}
          />
        </div>
      </PanelShell>

      <PanelShell eyebrow="Hits" title="关键词命中结果" description="">
        <TopicFilterBar filters={filters} total={keywordTopics.length} />
        <TopicList items={filters.filtered} emptyTitle="暂无命中记录" emptyDescription="手动检查后，命中的内容会直接出现在这里。" />
      </PanelShell>
    </div>
  );
}