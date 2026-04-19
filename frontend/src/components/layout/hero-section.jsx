import { Globe, Mail, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { HoverEffect } from '../ui/card-hover-effect';
import { BackgroundBeams } from '../ui/background-beams';
import { Spotlight } from '../ui/spotlight';
import { ActionButton, InfoBadge, MiniPanel, SecondaryButton, EmptyState } from '../shared/ui-kit';
import { cn } from '../../lib/utils';
import { scoreTone, sourceTone, timeAgo } from '../../lib/format';

export function HeroSection({
  status,
  settings,
  heroTopic,
  keywordTopics,
  unreadNotifications,
  metricCards,
  onOpenSearch,
  onOpenKeywords,
}) {
  return (
    <>
      <section className="panel-surface relative overflow-hidden rounded-[2rem] px-6 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
        <Spotlight className="left-0 top-0" fill="#7ef7db" />
        <BackgroundBeams className="opacity-45" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="beam-line" />
        <div className="beam-line" />
        <div className="beam-line" />

        <div className="relative z-10">
          {/* top row: badge + action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
              <Radar className="h-3.5 w-3.5 text-emerald-200" />
              live intelligence cockpit
            </div>
            <div className="flex gap-3">
              <ActionButton icon={Sparkles} onClick={onOpenSearch}>
                立即核验一条热点
              </ActionButton>
              <SecondaryButton icon={Radar} onClick={onOpenKeywords}>
                管理监控关键词
              </SecondaryButton>
            </div>
          </div>

          {/* status badges */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoBadge icon={ShieldCheck} label="AI 已验证" value={status.openrouter ? 'OpenRouter 在线' : '等待配置'} />
            <InfoBadge icon={Globe} label="多源聚合" value={status.twitter ? '网页 + Twitter' : '网页为主'} />
            <InfoBadge icon={Mail} label="提醒链路" value={settings.notify_email ? '浏览器 + 邮件' : '浏览器已就绪'} />
          </div>

          {/* main content: snapshot card + mini panels */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.45fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="panel-surface relative rounded-[1.75rem] border-white/12 p-5 lg:p-6"
            >
              <BackgroundBeams className="opacity-30" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">现在值得关注</p>
                    <p className="mt-2 font-display text-2xl text-white">热点快照</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                    {status.topics} 条热点已入库
                  </div>
                </div>

                {heroTopic ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">最新热点</p>
                        <a
                          href={heroTopic.source_url || '#'}
                          target={heroTopic.source_url ? '_blank' : undefined}
                          rel="noreferrer"
                          className="mt-2 block font-display text-xl leading-snug text-white transition hover:text-emerald-200"
                        >
                          {heroTopic.title}
                        </a>
                      </div>
                      <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', scoreTone(heroTopic.score || 0))}>
                        {Math.round(heroTopic.score || 0)}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300/85">{heroTopic.summary || ''}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className={cn('rounded-full border px-2.5 py-1', sourceTone(heroTopic.source))}>{heroTopic.source || 'mixed'}</span>
                      {heroTopic.source_engine ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">引擎: {heroTopic.source_engine}</span> : null}
                      {heroTopic.source_domain ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">站点: {heroTopic.source_domain}</span> : null}
                      {Number(heroTopic.rule_score || 0) > 0 ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">规则分: {Math.round(heroTopic.rule_score)}</span> : null}
                      {heroTopic.domain ? <span>领域: {heroTopic.domain}</span> : null}
                      <span>{timeAgo(heroTopic.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Sparkles} title="暂无热点" description="添加领域或关键词后触发收集。" />
                )}
              </div>
            </motion.div>

            {/* right side: mini panels */}
            <div className="grid gap-3">
              <MiniPanel label="热点入库" value={`${status.topics} 条`} helper="" />
              <MiniPanel label="关键词命中" value={`${keywordTopics.length} 条`} helper="" />
              <MiniPanel label="未读提醒" value={`${unreadNotifications.length} 条`} helper="" />
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard-panel">
        <HoverEffect items={metricCards} />
      </section>
    </>
  );
}