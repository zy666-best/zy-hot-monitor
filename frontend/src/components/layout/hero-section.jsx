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
      <section className="panel-surface relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Spotlight className="left-0 top-0" fill="#7ef7db" />
        <BackgroundBeams className="opacity-45" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="beam-line" />
        <div className="beam-line" />
        <div className="beam-line" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
              <Radar className="h-3.5 w-3.5 text-emerald-200" />
              live intelligence cockpit
            </div>
            <h1 className="text-balance font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              更快发现热点，
              <span className="text-emerald-200">更早验证价值</span>
              ，更利落地把内容分享出去。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              这不是传统监控后台，而是一块为 AI 编程开发者设计的作战桌面。它把多源搜索、真实性验证、实时提醒和话题整理压进一条清晰链路，帮你少刷无效信息，多拿可传播结论。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionButton icon={Sparkles} onClick={onOpenSearch}>
                立即核验一条热点
              </ActionButton>
              <SecondaryButton icon={Radar} onClick={onOpenKeywords}>
                管理监控关键词
              </SecondaryButton>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoBadge icon={ShieldCheck} label="AI 已验证" value={status.openrouter ? 'OpenRouter 在线' : '等待配置'} />
              <InfoBadge icon={Globe} label="多源聚合" value={status.twitter ? '网页 + Twitter' : '网页为主'} />
              <InfoBadge icon={Mail} label="提醒链路" value={settings.notify_email ? '浏览器 + 邮件' : '浏览器已就绪'} />
            </div>
          </div>

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
                      <p className="text-sm text-slate-400">最新高价值信号</p>
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
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-300/85">{heroTopic.summary || '等待更多摘要内容。'}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className={cn('rounded-full border px-2.5 py-1', sourceTone(heroTopic.source))}>{heroTopic.source || 'mixed'}</span>
                    {heroTopic.domain ? <span>领域: {heroTopic.domain}</span> : null}
                    <span>{timeAgo(heroTopic.created_at)}</span>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Sparkles} title="等待首个热点进入快照" description="添加领域或手动刷新后，这里会优先呈现值得你第一时间分享的内容。" />
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniPanel label="关键词命中" value={`${keywordTopics.length} 条`} helper="优先监听你明确在意的对象" />
                <MiniPanel label="未读提醒" value={`${unreadNotifications.length} 条`} helper="高优先级事件尚未处理" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="dashboard-panel">
        <HoverEffect items={metricCards} />
      </section>
    </>
  );
}