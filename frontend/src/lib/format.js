export function timeAgo(dateStr) {
  if (!dateStr) return '刚刚';

  const date = new Date(String(dateStr).replace(' ', 'T'));
  const diff = (Date.now() - date.getTime()) / 1000;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (!hours) return `${minutes} 分钟`;
  return `${hours} 小时 ${minutes} 分钟`;
}

export function scoreTone(score) {
  if (score >= 75) return 'text-emerald-300 border-emerald-300/20 bg-emerald-400/10';
  if (score >= 45) return 'text-amber-300 border-amber-300/20 bg-amber-400/10';
  return 'text-slate-300 border-white/10 bg-white/5';
}

export function sourceTone(source) {
  if (source === 'twitter' || source === 'twitter_trend') {
    return 'bg-sky-400/10 text-sky-200 border-sky-300/15';
  }

  if (source === 'news') {
    return 'bg-amber-300/10 text-amber-100 border-amber-200/15';
  }

  if (source === 'web') {
    return 'bg-emerald-400/10 text-emerald-200 border-emerald-300/15';
  }

  return 'bg-white/5 text-slate-200 border-white/10';
}