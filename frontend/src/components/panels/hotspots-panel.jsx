import { useMemo, useState } from 'react';
import { ArrowDownUp, Filter, RefreshCcw, Sparkles, X } from 'lucide-react';
import { ActionButton, ChipField, LabeledInput, PanelShell, SecondaryButton, TopicList } from '../shared/ui-kit';
import { cn } from '../../lib/utils';

/* ── sort presets ── */
const SORT_OPTIONS = [
  { id: 'newest', label: '最新优先' },
  { id: 'oldest', label: '最早优先' },
  { id: 'score', label: 'AI 置信度' },
  { id: 'rule_score', label: '规则分' },
  { id: 'cross', label: '多源命中' },
];

/* ── time-range presets (ms) ── */
const TIME_RANGES = [
  { id: '', label: '全部' },
  { id: '1h', label: '1 小时', ms: 3600_000 },
  { id: '24h', label: '今天', ms: 86400_000 },
  { id: '3d', label: '3 天', ms: 259200_000 },
  { id: '7d', label: '7 天', ms: 604800_000 },
];

/* ── verified filter ── */
const VERIFY_OPTIONS = [
  { id: '', label: '全部' },
  { id: 'verified', label: '已验证' },
  { id: 'unverified', label: '未验证' },
];

/* ── helpers ── */
function unique(items, getter) {
  const set = new Set();
  for (const it of items) {
    const v = getter(it);
    if (v) set.add(v);
  }
  return [...set].sort();
}

function num(v) {
  return Number(v ?? 0);
}

/* ── small reusable filter widgets ── */

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
      <span className="whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-white outline-none">
        {options.map((o) => (
          <option key={o.id ?? o} value={o.id ?? o} className="bg-slate-950">
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
            value === o.id
              ? 'bg-emerald-300/15 text-emerald-200 border border-emerald-300/25'
              : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-xs font-medium transition border',
        active
          ? 'bg-emerald-300/15 text-emerald-200 border-emerald-300/25'
          : 'bg-white/5 text-slate-400 border-white/8 hover:bg-white/8',
      )}
    >
      {label}
    </button>
  );
}

/* ── main component ── */

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
  /* local filter / sort state */
  const [sortBy, setSortBy] = useState('newest');
  const [timeRange, setTimeRange] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [sourceTypes, setSourceTypes] = useState([]);
  const [engines, setEngines] = useState([]);
  const [siteDomains, setSiteDomains] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  /* derive unique values from data */
  const availableSourceTypes = useMemo(() => unique(hotTopics, (i) => i.source_type || i.source), [hotTopics]);
  const availableEngines = useMemo(() => unique(hotTopics, (i) => i.source_engine), [hotTopics]);
  const availableSiteDomains = useMemo(() => unique(hotTopics, (i) => i.source_domain), [hotTopics]);
  const availableLanguages = useMemo(() => unique(hotTopics, (i) => i.language), [hotTopics]);

  /* toggle helpers for multi-select */
  function toggleSet(setter, value) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  /* active filter count */
  const activeCount =
    (timeRange ? 1 : 0) +
    (verifyFilter ? 1 : 0) +
    sourceTypes.length +
    engines.length +
    siteDomains.length +
    languages.length +
    (minScore > 0 ? 1 : 0);

  /* compute filtered + sorted list */
  const displayTopics = useMemo(() => {
    let list = [...hotTopics];

    // time range
    if (timeRange) {
      const preset = TIME_RANGES.find((t) => t.id === timeRange);
      if (preset) {
        const cutoff = Date.now() - preset.ms;
        list = list.filter((it) => {
          const d = new Date(String(it.created_at || '').replace(' ', 'T'));
          return d.getTime() >= cutoff;
        });
      }
    }

    // verified
    if (verifyFilter === 'verified') list = list.filter((it) => it.is_verified === 1);
    if (verifyFilter === 'unverified') list = list.filter((it) => !it.is_verified);

    // source type
    if (sourceTypes.length) {
      list = list.filter((it) => sourceTypes.includes(it.source_type || it.source));
    }

    // engine
    if (engines.length) {
      list = list.filter((it) => engines.includes(it.source_engine));
    }

    // site domain
    if (siteDomains.length) {
      list = list.filter((it) => siteDomains.includes(it.source_domain));
    }

    // language
    if (languages.length) {
      list = list.filter((it) => languages.includes(it.language));
    }

    // min score
    if (minScore > 0) {
      list = list.filter((it) => num(it.score) >= minScore || num(it.rule_score) >= minScore);
    }

    // sort
    switch (sortBy) {
      case 'oldest':
        list.sort((a, b) => new Date(String(a.created_at || '').replace(' ', 'T')) - new Date(String(b.created_at || '').replace(' ', 'T')));
        break;
      case 'score':
        list.sort((a, b) => num(b.score) - num(a.score));
        break;
      case 'rule_score':
        list.sort((a, b) => num(b.rule_score) - num(a.rule_score));
        break;
      case 'cross':
        list.sort((a, b) => num(b.cross_source_count) - num(a.cross_source_count));
        break;
      default: // newest
        list.sort((a, b) => new Date(String(b.created_at || '').replace(' ', 'T')) - new Date(String(a.created_at || '').replace(' ', 'T')));
    }

    return list;
  }, [hotTopics, sortBy, timeRange, verifyFilter, sourceTypes, engines, siteDomains, languages, minScore]);

  function resetFilters() {
    setTimeRange('');
    setVerifyFilter('');
    setSourceTypes([]);
    setEngines([]);
    setSiteDomains([]);
    setLanguages([]);
    setMinScore(0);
  }

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
        {/* ── top bar: domain select + sort + filter toggle ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* domain filter (existing) */}
          <SelectFilter
            label="领域"
            value={domainFilter}
            onChange={setDomainFilter}
            options={[{ id: '', label: '全部' }, ...domains.map((d) => ({ id: d.name, label: d.name }))]}
          />

          {/* sort */}
          <SelectFilter label="排序" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />

          {/* filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition',
              showFilters || activeCount > 0
                ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/8',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            筛选{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-400 hover:bg-white/8"
            >
              <X className="h-3 w-3" /> 清除
            </button>
          )}

          {/* result count */}
          <span className="ml-auto text-xs text-slate-500">
            {displayTopics.length}/{hotTopics.length} 条
          </span>
        </div>

        {/* ── expanded filter panel ── */}
        {showFilters && (
          <div className="mb-4 space-y-3 rounded-2xl border border-white/8 bg-black/20 p-4">
            {/* time range */}
            <div>
              <p className="mb-2 text-xs text-slate-500">时间范围</p>
              <ToggleGroup options={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
            </div>

            {/* verified */}
            <div>
              <p className="mb-2 text-xs text-slate-500">AI 验证</p>
              <ToggleGroup options={VERIFY_OPTIONS} value={verifyFilter} onChange={setVerifyFilter} />
            </div>

            {/* source type */}
            {availableSourceTypes.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-slate-500">来源类型</p>
                <div className="flex flex-wrap gap-1">
                  {availableSourceTypes.map((st) => (
                    <MultiChip key={st} label={st} active={sourceTypes.includes(st)} onClick={() => toggleSet(setSourceTypes, st)} />
                  ))}
                </div>
              </div>
            )}

            {/* engine */}
            {availableEngines.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-slate-500">搜索引擎</p>
                <div className="flex flex-wrap gap-1">
                  {availableEngines.map((eg) => (
                    <MultiChip key={eg} label={eg} active={engines.includes(eg)} onClick={() => toggleSet(setEngines, eg)} />
                  ))}
                </div>
              </div>
            )}

            {/* site domain */}
            {availableSiteDomains.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-slate-500">来源站点</p>
                <div className="flex flex-wrap gap-1">
                  {availableSiteDomains.map((sd) => (
                    <MultiChip key={sd} label={sd} active={siteDomains.includes(sd)} onClick={() => toggleSet(setSiteDomains, sd)} />
                  ))}
                </div>
              </div>
            )}

            {/* language */}
            {availableLanguages.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-slate-500">语言</p>
                <div className="flex flex-wrap gap-1">
                  {availableLanguages.map((lg) => (
                    <MultiChip key={lg} label={lg} active={languages.includes(lg)} onClick={() => toggleSet(setLanguages, lg)} />
                  ))}
                </div>
              </div>
            )}

            {/* min score slider */}
            <div>
              <p className="mb-2 text-xs text-slate-500">最低分数阈值: {minScore}</p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        )}

        <TopicList items={displayTopics} emptyTitle="还没有领域热点" emptyDescription="完成一次热点收集后，这里会出现按价值排序的话题。" />
      </PanelShell>
    </div>
  );
}