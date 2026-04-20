import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/* ── sort presets ── */
const SORT_OPTIONS = [
  { id: 'newest', label: '最新优先' },
  { id: 'oldest', label: '最早优先' },
  { id: 'score', label: 'AI 相关度' },
  { id: 'rule_score', label: '规则分' },
];

/* ── time-range presets (ms) ── */
const TIME_RANGES = [
  { id: '', label: '全部' },
  { id: '1h', label: '1 小时', ms: 3600_000 },
  { id: '24h', label: '今天', ms: 86400_000 },
  { id: '3d', label: '3 天', ms: 259200_000 },
  { id: '7d', label: '7 天', ms: 604800_000 },
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

function parseDate(str) {
  if (!str) return new Date(0);
  const d = new Date(String(str).replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/* ── hook: useTopicFilters ── */
export function useTopicFilters(items) {
  const [sortBy, setSortBy] = useState('newest');
  const [timeRange, setTimeRange] = useState('');
  const [sourceTypes, setSourceTypes] = useState([]);
  const [engines, setEngines] = useState([]);
  const [siteDomains, setSiteDomains] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const availableSourceTypes = useMemo(() => unique(items, (i) => i.source_type || i.source), [items]);
  const availableEngines = useMemo(() => unique(items, (i) => i.source_engine), [items]);
  const availableSiteDomains = useMemo(() => unique(items, (i) => i.source_domain), [items]);
  const availableLanguages = useMemo(() => unique(items, (i) => i.language), [items]);

  function toggleSet(setter, value) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const activeCount =
    (timeRange ? 1 : 0) +
    sourceTypes.length +
    engines.length +
    siteDomains.length +
    languages.length +
    (minScore > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...items];

    if (timeRange) {
      const preset = TIME_RANGES.find((t) => t.id === timeRange);
      if (preset) {
        const cutoff = Date.now() - preset.ms;
        list = list.filter((it) => parseDate(it.created_at).getTime() >= cutoff);
      }
    }

    if (sourceTypes.length) {
      list = list.filter((it) => sourceTypes.includes(it.source_type || it.source));
    }
    if (engines.length) {
      list = list.filter((it) => engines.includes(it.source_engine));
    }
    if (siteDomains.length) {
      list = list.filter((it) => siteDomains.includes(it.source_domain));
    }
    if (languages.length) {
      list = list.filter((it) => languages.includes(it.language));
    }
    if (minScore > 0) {
      list = list.filter((it) => num(it.score) >= minScore || num(it.rule_score) >= minScore);
    }

    switch (sortBy) {
      case 'oldest':
        list.sort((a, b) => parseDate(a.created_at) - parseDate(b.created_at));
        break;
      case 'score':
        list.sort((a, b) => num(b.score) - num(a.score));
        break;
      case 'rule_score':
        list.sort((a, b) => num(b.rule_score) - num(a.rule_score));
        break;
      default:
        list.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
    }

    return list;
  }, [items, sortBy, timeRange, sourceTypes, engines, siteDomains, languages, minScore]);

  function resetFilters() {
    setTimeRange('');
    setSourceTypes([]);
    setEngines([]);
    setSiteDomains([]);
    setLanguages([]);
    setMinScore(0);
  }

  return {
    sortBy, setSortBy,
    timeRange, setTimeRange,
    sourceTypes, setSourceTypes,
    engines, setEngines,
    siteDomains, setSiteDomains,
    languages, setLanguages,
    minScore, setMinScore,
    showFilters, setShowFilters,
    activeCount,
    filtered,
    resetFilters,
    toggleSet,
    availableSourceTypes,
    availableEngines,
    availableSiteDomains,
    availableLanguages,
  };
}

/* ── small reusable filter widgets ── */

export function SelectFilter({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  const current = options.find((o) => (o.id ?? o) === value);
  const displayLabel = current?.label ?? current ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition select-none',
          open
            ? 'border-emerald-300/30 bg-emerald-300/8 text-emerald-200'
            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8',
        )}
      >
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{displayLabel}</span>
        <ChevronDown className={cn('h-3 w-3 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[10rem] overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-xl shadow-black/40 backdrop-blur-sm">
          {options.map((o) => {
            const id = o.id ?? o;
            const optLabel = o.label ?? o;
            const active = id === value;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { onChange(id); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs transition',
                  active
                    ? 'bg-emerald-300/10 text-emerald-200'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-400' : 'bg-transparent')} />
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
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

/* ── TopicFilterBar: toolbar + expandable filter panel ── */
export function TopicFilterBar({ filters, total, extraControls }) {
  const {
    sortBy, setSortBy,
    timeRange, setTimeRange,
    sourceTypes, setSourceTypes,
    engines, setEngines,
    siteDomains, setSiteDomains,
    languages, setLanguages,
    minScore, setMinScore,
    showFilters, setShowFilters,
    activeCount, filtered, resetFilters, toggleSet,
    availableSourceTypes, availableEngines, availableSiteDomains, availableLanguages,
  } = filters;

  return (
    <div className="mb-4">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3">
        {extraControls}

        <SelectFilter label="排序" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />

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

        <span className="ml-auto text-xs text-slate-500">
          {filtered.length}/{total} 条
        </span>
      </div>

      {/* expanded filter panel */}
      {showFilters && (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/8 bg-black/20 p-4">
          <div>
            <p className="mb-2 text-xs text-slate-500">时间范围</p>
            <ToggleGroup options={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          </div>

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
    </div>
  );
}
