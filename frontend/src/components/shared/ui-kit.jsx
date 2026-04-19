import { Activity, ChevronRight, Pause, Radar, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { scoreTone, sourceTone, timeAgo } from '../../lib/format';
import { cn } from '../../lib/utils';

function normalizeItemUrl(item) {
  return item.source_url || item.url || '';
}

function detailValue(value) {
  return String(value || '').trim();
}

export function PanelShell({ eyebrow, title, description, action, children }) {
  return (
    <section className="panel-surface rounded-[2rem] p-5 sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl text-white">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ActionButton({ icon: Icon, children, onClick, loading, small = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60',
        small && 'px-3.5 py-2 text-sm',
      )}
    >
      <Icon className={cn('h-4 w-4', loading && 'animate-spin')} />
      {children}
    </button>
  );
}

export function SecondaryButton({ icon: Icon, children, onClick, loading, small = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-100 transition hover:border-emerald-300/30 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60',
        small && 'px-3.5 py-2 text-sm',
      )}
    >
      <Icon className={cn('h-4 w-4', loading && 'animate-spin')} />
      {children}
    </button>
  );
}

export function InfoBadge({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4 text-emerald-200" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export function MiniPanel({ label, value, helper }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function StatusCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4 text-emerald-200" />
        {label}
      </div>
      <p className="mt-3 font-display text-2xl text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p> : null}
    </div>
  );
}

export function LabeledInput({ label, value, onChange, placeholder, type = 'text', onEnter }) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/35 focus:bg-black/30"
      />
    </label>
  );
}

export function SettingsInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/35"
      />
    </label>
  );
}

export function ChipField({ items, emptyText, renderLabel, onToggle, onDelete }) {
  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm',
            item.enabled ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-50' : 'border-white/10 bg-white/5 text-slate-400',
          )}
        >
          <span>{renderLabel(item)}</span>
          <button type="button" onClick={() => onToggle(item)} aria-label="切换状态" className="rounded-full p-1 hover:bg-white/10">
            {item.enabled ? <Pause className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => onDelete(item)} aria-label="删除" className="rounded-full p-1 hover:bg-white/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function TopicList({ items, emptyTitle, emptyDescription }) {
  if (!items.length) {
    return <EmptyState icon={Sparkles} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const itemUrl = normalizeItemUrl(item);
        const engine = detailValue(item.source_engine || item.sourceEngine);
        const domain = detailValue(item.source_domain || item.sourceDomain);
        const ruleScore = Number(item.rule_score ?? item.ruleScore ?? 0);
        const crossSourceCount = Number(item.cross_source_count ?? item.crossSourceCount ?? 0);

        return (
          <motion.article
            key={`${item.id || item.title}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.16) }}
            className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4 transition hover:border-emerald-300/20 hover:bg-black/30"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <a
                  href={itemUrl || '#'}
                  target={itemUrl ? '_blank' : undefined}
                  rel="noreferrer"
                  className="font-display text-xl leading-snug text-white transition hover:text-emerald-200"
                >
                  {item.title}
                </a>
                {item.summary ? <p className="mt-3 text-sm leading-7 text-slate-300/85">{item.summary}</p> : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {typeof item.score === 'number' && item.score > 0 ? (
                  <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', scoreTone(item.score))}>
                    {Math.round(item.score)}
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={cn('rounded-full border px-2.5 py-1', sourceTone(item.source))}>{item.source || 'mixed'}</span>
              {engine ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">引擎: {engine}</span> : null}
              {domain ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">站点: {domain}</span> : null}
              {typeof item.score === 'number' && item.score > 0 ? <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-violet-100">AI 置信度: {Math.round(item.score)}</span> : null}
              {ruleScore > 0 ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">规则分: {Math.round(ruleScore)}</span> : null}
              {crossSourceCount > 1 ? <span className="rounded-full border border-sky-300/15 bg-sky-400/10 px-2.5 py-1 text-sky-100">多源命中: {crossSourceCount}</span> : null}
              {item.domain ? <span>领域: {item.domain}</span> : null}
              <span>{timeAgo(item.created_at || item.timestamp)}</span>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

export function NotificationRow({ item, compact = false }) {
  return (
    <div
      className={cn(
        'rounded-[1.4rem] border px-4 py-3',
        item.is_read ? 'border-white/8 bg-white/4' : 'border-emerald-300/15 bg-emerald-300/10',
        compact && 'rounded-2xl',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-white/10 bg-black/20 p-2 text-slate-100">
          {item.type === 'keyword_hit' ? <Radar className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{item.title}</p>
            {!item.is_read ? <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-slate-950">NEW</span> : null}
          </div>
          {item.content ? <p className="mt-1 text-sm leading-6 text-slate-300/80">{item.content}</p> : null}
        </div>
        <span className="shrink-0 text-xs text-slate-500">{timeAgo(item.sent_at)}</span>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/10 px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-display text-xl text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}