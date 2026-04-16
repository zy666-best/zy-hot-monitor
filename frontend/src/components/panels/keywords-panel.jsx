import { Radar, Sparkles } from 'lucide-react';
import { ActionButton, ChipField, LabeledInput, PanelShell, SecondaryButton, TopicList } from '../shared/ui-kit';

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
  return (
    <div id="keywords-panel" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <PanelShell eyebrow="Monitor" title="关键词监控" description="只盯最重要的词，剩下的交给系统筛噪。">
        <div className="space-y-4">
          <LabeledInput
            label="新增关键词"
            placeholder="例如：GPT-5、Claude Code、OpenAI 发布会"
            value={keywordInput}
            onChange={setKeywordInput}
            onEnter={addKeyword}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionButton icon={Sparkles} onClick={addKeyword} loading={busy.addKeyword}>
              添加关键词
            </ActionButton>
            <SecondaryButton icon={Radar} onClick={triggerKeywordCheck} loading={busy.keywordCheck}>
              立即检查
            </SecondaryButton>
          </div>

          <ChipField
            items={keywords}
            emptyText="还没有监控词。先把你最在意的发布对象、模型名或公司名加进来。"
            renderLabel={(item) => item.keyword}
            onToggle={(item) => toggleKeyword(item.id, item.enabled ? 0 : 1)}
            onDelete={(item) => deleteKeyword(item.id)}
          />
        </div>
      </PanelShell>

      <PanelShell eyebrow="Hits" title="关键词命中结果" description="命中记录会按新鲜度排序，方便你直接做二次判断。">
        <TopicList items={keywordTopics} emptyTitle="暂无命中记录" emptyDescription="手动检查后，命中的内容会直接出现在这里。" />
      </PanelShell>
    </div>
  );
}