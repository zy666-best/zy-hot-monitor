import { Activity, ChevronDown, ChevronRight, Eye, Heart, MessageCircle, Pause, Radar, Repeat2, Sparkles, Trash2, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
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

/* ── helpers for keyword highlighting ── */
function highlightText(text, keyword) {
  if (!text || !keyword) return text;
  const words = keyword.split(/[\s,，]+/).filter(Boolean);
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    pattern.test(part)
      ? <mark key={i} className="rounded bg-amber-400/20 px-0.5 text-amber-200">{part}</mark>
      : part
  );
}

function compactNumber(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function EngagementPill({ icon: Icon, value, className }) {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[11px] text-slate-300', className)}>
      <Icon className="h-3 w-3" />
      {compactNumber(v)}
    </span>
  );
}

function langLabel(code) {
  if (code === 'zh') return '中文';
  if (code === 'en') return 'English';
  if (code === 'mixed') return '中英混合';
  return code || '';
}

export function TopicList({ items, emptyTitle, emptyDescription, highlightKeyword }) {
  const [expandedReasons, setExpandedReasons] = useState(new Set());
  const [allReasonsExpanded, setAllReasonsExpanded] = useState(false);

  if (!items.length) {
    return <EmptyState icon={Sparkles} title={emptyTitle} description={emptyDescription} />;
  }

  const hasAnyReason = items.some(it => detailValue(it.ai_reason));

  function toggleReason(key) {
    setExpandedReasons(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllReasons() {
    if (allReasonsExpanded) {
      setExpandedReasons(new Set());
      setAllReasonsExpanded(false);
    } else {
      const allKeys = new Set(items.map((_, i) => i));
      setExpandedReasons(allKeys);
      setAllReasonsExpanded(true);
    }
  }

  return (
    <div className="space-y-3">
      {/* global toggle for AI reasons */}
      {hasAnyReason && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleAllReasons}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/8 hover:text-slate-200"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', allReasonsExpanded && 'rotate-180')} />
            {allReasonsExpanded ? '收起全部理由' : '展开全部理由'}
          </button>
        </div>
      )}

      {items.map((item, index) => {
        const itemUrl = normalizeItemUrl(item);
        const engine = detailValue(item.source_engine || item.sourceEngine);
        const domain = detailValue(item.source_domain || item.sourceDomain);
        const ruleScore = Number(item.rule_score ?? item.ruleScore ?? 0);
        const crossSourceCount = Number(item.cross_source_count ?? item.crossSourceCount ?? 0);
        const aiReason = detailValue(item.ai_reason || item.aiReason);
        const reasonExpanded = expandedReasons.has(index);

        // engagement
        const likes = Number(item.likes) || 0;
        const retweets = Number(item.retweets) || 0;
        const replies = Number(item.replies) || 0;
        const views = Number(item.views) || 0;
        const hasEngagement = likes > 0 || retweets > 0 || replies > 0 || views > 0;

        // author
        const author = detailValue(item.author);
        const authorName = detailValue(item.author_name || item.authorName);
        const authorFollowers = Number(item.author_followers || item.authorFollowers) || 0;
        const hasAuthor = author || authorName;

        // summary type
        const summaryType = item.summary_type || item.summaryType || '';
        const isAiSummary = summaryType === 'ai';

        // published_at
        const publishedAt = item.published_at || item.publishedAt || item.timestamp || '';

        // language
        const lang = detailValue(item.language);

        // verified status
        const isVerified = Number(item.is_verified) === 1;

        // multi-source detail
        const sourceEnginesStr = detailValue(item.source_engines || item.sourceEngines);
        const sourceDomainsStr = detailValue(item.source_domains || item.sourceDomains);

        // keyword for highlight
        const kw = highlightKeyword || item.domain || '';

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
                  {highlightText(item.title, kw)}
                </a>

                {item.summary ? (
                  <div className="mt-3 flex items-start gap-2">
                    <p className="text-sm leading-7 text-slate-300/85">
                      {highlightText(item.summary, kw)}
                    </p>
                    {isAiSummary && (
                      <span className="mt-1 shrink-0 rounded-md border border-violet-300/20 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">AI 摘要</span>
                    )}
                  </div>
                ) : null}
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

            {/* author + engagement row */}
            {(hasAuthor || hasEngagement) && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {hasAuthor && (
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-200">{authorName || author}</span>
                    {author && authorName && author !== authorName && <span className="text-slate-500">@{author}</span>}
                    {authorFollowers > 0 && <span className="text-slate-500">· {compactNumber(authorFollowers)} 粉丝</span>}
                  </span>
                )}
                {hasEngagement && (
                  <div className="flex items-center gap-1.5">
                    <EngagementPill icon={Heart} value={likes} />
                    <EngagementPill icon={Repeat2} value={retweets} />
                    <EngagementPill icon={MessageCircle} value={replies} />
                    <EngagementPill icon={Eye} value={views} />
                  </div>
                )}
              </div>
            )}

            {/* metadata badges row */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={cn('rounded-full border px-2.5 py-1', sourceTone(item.source))}>{item.source || 'mixed'}</span>
              {isVerified
                ? <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">✓ 已验证</span>
                : <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">规则兜底</span>
              }
              {engine ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">引擎: {engine}</span> : null}
              {domain ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">站点: {domain}</span> : null}
              {typeof item.score === 'number' && item.score > 0 ? <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-violet-100">AI 置信度: {Math.round(item.score)}</span> : null}
              {ruleScore > 0 ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">规则分: {Math.round(ruleScore)}</span> : null}
              {crossSourceCount > 1 ? (
                <span
                  className="group relative cursor-help rounded-full border border-sky-300/15 bg-sky-400/10 px-2.5 py-1 text-sky-100"
                  title={sourceEnginesStr ? `引擎: ${sourceEnginesStr}\n站点: ${sourceDomainsStr}` : ''}
                >
                  多源命中: {crossSourceCount}
                  {sourceEnginesStr && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl group-hover:block">
                      <span className="block">引擎: {sourceEnginesStr}</span>
                      {sourceDomainsStr && <span className="block">站点: {sourceDomainsStr}</span>}
                    </span>
                  )}
                </span>
              ) : null}
              {lang ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">{langLabel(lang)}</span> : null}
              {item.domain ? <span>领域: {item.domain}</span> : null}
              {publishedAt && publishedAt !== (item.created_at || '') && (
                <span className="text-slate-500" title={publishedAt}>发布于 {timeAgo(publishedAt)}</span>
              )}
              <span>{timeAgo(item.created_at || item.timestamp)}</span>
            </div>

            {/* AI reason expand/collapse */}
            {aiReason && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => toggleReason(index)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
                >
                  <ChevronDown className={cn('h-3 w-3 transition-transform', reasonExpanded && 'rotate-180')} />
                  AI 分析理由
                </button>
                <AnimatePresence>
                  {reasonExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-2 rounded-xl border border-violet-300/10 bg-violet-400/5 px-3 py-2 text-xs leading-5 text-violet-100/80">
                        {aiReason}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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