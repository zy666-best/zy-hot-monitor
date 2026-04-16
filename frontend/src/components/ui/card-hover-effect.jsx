import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function HoverEffect({ items, className }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className={cn('grid grid-cols-1 gap-4 py-2 md:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item, index) => (
        <a
          href={item.link}
          key={item.link + item.title}
          className="group relative block h-full w-full p-2"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === index ? (
              <motion.span
                className="absolute inset-0 block h-full w-full rounded-[28px] bg-white/8"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            ) : null}
          </AnimatePresence>
          <Card className="border-white/10 bg-slate-950/80 backdrop-blur-xl group-hover:border-emerald-300/30">
            <div className="space-y-3 p-5">
              {item.kicker ? (
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-emerald-200/70">
                  {item.kicker}
                </p>
              ) : null}
              <div className="flex items-end justify-between gap-4">
                <CardTitle className="mt-0 text-base text-slate-50">{item.title}</CardTitle>
                {item.value ? (
                  <span className="font-display text-2xl font-semibold text-white">{item.value}</span>
                ) : null}
              </div>
              <CardDescription className="mt-0 text-sm leading-6 text-slate-300/80">
                {item.description}
              </CardDescription>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}

export function Card({ className, children }) {
  return (
    <div
      className={cn(
        'relative z-20 h-full w-full overflow-hidden rounded-2xl border border-transparent bg-black',
        className,
      )}
    >
      <div className="relative z-50">{children}</div>
    </div>
  );
}

export function CardTitle({ className, children }) {
  return <h4 className={cn('mt-4 font-bold tracking-wide text-zinc-100', className)}>{children}</h4>;
}

export function CardDescription({ className, children }) {
  return (
    <p className={cn('mt-8 text-sm leading-relaxed tracking-wide text-zinc-400', className)}>
      {children}
    </p>
  );
}