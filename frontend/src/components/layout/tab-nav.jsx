import { cn } from '../../lib/utils';

export function TabNav({ tabs, activeTab, onSelect }) {
  return (
    <nav className="flex flex-wrap gap-2 rounded-3xl border border-white/8 bg-slate-950/60 p-2 backdrop-blur-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm font-medium transition',
            activeTab === tab.id
              ? 'bg-emerald-300 text-slate-950 shadow-[0_10px_30px_rgba(108,247,214,0.25)]'
              : 'text-slate-300 hover:bg-white/6 hover:text-white',
          )}
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}