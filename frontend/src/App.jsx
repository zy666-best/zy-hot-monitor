import { startTransition, useEffect, useRef, useState } from 'react';
import { api } from './lib/api';
import { HeaderBar } from './components/layout/header-bar';
import { HeroSection } from './components/layout/hero-section';
import { TabNav } from './components/layout/tab-nav';
import { DashboardPanel } from './components/panels/dashboard-panel';
import { HotspotsPanel } from './components/panels/hotspots-panel';
import { KeywordsPanel } from './components/panels/keywords-panel';
import { NotificationsPanel } from './components/panels/notifications-panel';
import { SearchPanel } from './components/panels/search-panel';
import { SettingsPanel } from './components/panels/settings-panel';

const tabs = [
  { id: 'dashboard', label: '总览' },
  { id: 'keywords', label: '关键词监控' },
  { id: 'hotspots', label: '热点追踪' },
  { id: 'search', label: '快速核验' },
  { id: 'notifications', label: '通知中心' },
  { id: 'settings', label: '设置' },
];

export const SEARCH_SOURCE_OPTIONS = [
  { id: 'web', label: '网页聚合' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'bing', label: 'Bing 网页' },
  { id: 'bing-news', label: 'Bing News' },
  { id: 'priority-sites', label: '国内优先站点' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'twitter', label: 'Twitter / X' },
];

const initialStatus = {
  keywords: 0,
  domains: 0,
  topics: 0,
  unread: 0,
  openrouter: false,
  twitter: false,
  uptime: 0,
};

const initialSettings = {
  smtp_host: '',
  smtp_port: '465',
  smtp_user: '',
  smtp_pass: '',
  notify_email: '',
  openrouter_configured: false,
  twitter_configured: false,
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(initialStatus);
  const [keywords, setKeywords] = useState([]);
  const [domains, setDomains] = useState([]);
  const [recentTopics, setRecentTopics] = useState([]);
  const [keywordTopics, setKeywordTopics] = useState([]);
  const [hotTopics, setHotTopics] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(initialSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSources, setSearchSources] = useState(['web', 'bilibili', 'twitter']);
  const [keywordInput, setKeywordInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [toasts, setToasts] = useState([]);
  const [logs, setLogs] = useState([{ id: crypto.randomUUID(), text: '控制台已连接，等待新信号。', type: 'info', time: new Date().toISOString() }]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [busy, setBusy] = useState({});
  const notifRef = useRef(null);

  const unreadNotifications = notifications.filter((item) => !item.is_read);
  const heroTopic = recentTopics[0];

  function pushToast(message, type = 'info') {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }

  function appendLog(text, type = 'info') {
    setLogs((current) => [{ id: crypto.randomUUID(), text, type, time: new Date().toISOString() }, ...current].slice(0, 14));
  }

  async function withBusy(key, task) {
    setBusy((current) => ({ ...current, [key]: true }));
    try {
      await task();
    } finally {
      setBusy((current) => ({ ...current, [key]: false }));
    }
  }

  async function loadStatus() {
    const { data } = await api('/status');
    setStatus(data);
  }

  async function loadRecentTopics() {
    const { data } = await api('/topics?limit=12');
    setRecentTopics(data);
  }

  async function loadKeywords() {
    const { data } = await api('/keywords');
    setKeywords(data);
  }

  async function loadDomains() {
    const { data } = await api('/domains');
    setDomains(data);
  }

  async function loadKeywordTopics() {
    const { data } = await api('/topics?type=keyword&limit=40');
    setKeywordTopics(data);
  }

  async function loadHotTopics(selectedDomain = domainFilter) {
    const query = selectedDomain
      ? `?type=hotspot&domain=${encodeURIComponent(selectedDomain)}&limit=50`
      : '?type=hotspot&limit=50';
    const { data } = await api(`/topics${query}`);
    setHotTopics(data);
  }

  async function loadNotifications() {
    const { data } = await api('/notifications');
    setNotifications(data);
  }

  async function loadSettings() {
    const { data } = await api('/settings');
    setSettings((current) => ({ ...current, ...data }));
  }

  async function bootstrap() {
    await Promise.all([
      loadStatus(),
      loadRecentTopics(),
      loadKeywords(),
      loadDomains(),
      loadKeywordTopics(),
      loadHotTopics(''),
      loadNotifications(),
      loadSettings(),
    ]);
  }

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    bootstrap()
      .then(() => appendLog('系统就绪，已接入热点与通知链路。', 'success'))
      .catch((error) => {
        pushToast(error.message, 'error');
        appendLog(`初始化失败: ${error.message}`, 'error');
      });

    const stream = new EventSource('/api/notifications/stream');
    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || '[]');
        if (!Array.isArray(payload) || !payload.length) return;

        payload.forEach((item) => {
          pushToast(`${item.keyword || '热点'}: ${item.title}`, 'success');
          appendLog(`发现新信号: ${item.title}`, 'success');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`热点监控 · ${item.keyword || '热点'}`, {
              body: item.title,
            });
          }
        });

        Promise.all([loadStatus(), loadRecentTopics(), loadKeywordTopics(), loadHotTopics(domainFilter), loadNotifications()]).catch(() => {});
      } catch {
      }
    };
    stream.onerror = () => {
      appendLog('实时通知链路重连中。', 'info');
    };

    return () => stream.close();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'hotspots') {
      loadHotTopics(domainFilter).catch(() => {});
    }
  }, [activeTab, domainFilter]);

  function switchTab(tab) {
    startTransition(() => setActiveTab(tab));
  }

  async function refreshOverview() {
    try {
      await withBusy('refresh', async () => {
        await Promise.all([loadStatus(), loadRecentTopics(), loadNotifications(), loadKeywordTopics(), loadHotTopics(domainFilter)]);
        pushToast('面板已刷新', 'success');
        appendLog('完成一次全局刷新。', 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
    }
  }

  async function addKeyword() {
    const keyword = keywordInput.trim();
    if (!keyword) return;

    try {
      await withBusy('addKeyword', async () => {
        await api('/keywords', { method: 'POST', body: { keyword } });
        setKeywordInput('');
        await Promise.all([loadKeywords(), loadStatus()]);
        pushToast(`已添加关键词: ${keyword}`, 'success');
        appendLog(`新增关键词监控: ${keyword}`, 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
    }
  }

  async function toggleKeyword(id, enabled) {
    await api(`/keywords/${id}`, { method: 'PUT', body: { enabled } });
    await Promise.all([loadKeywords(), loadStatus()]);
  }

  async function deleteKeyword(id) {
    await api(`/keywords/${id}`, { method: 'DELETE' });
    await Promise.all([loadKeywords(), loadStatus(), loadKeywordTopics()]);
    pushToast('关键词已删除', 'info');
  }

  async function triggerKeywordCheck() {
    try {
      await withBusy('keywordCheck', async () => {
        appendLog('手动触发关键词巡检。', 'info');
        await api('/keywords/check', { method: 'POST', body: {} });
        await Promise.all([loadStatus(), loadKeywordTopics(), loadNotifications(), loadRecentTopics()]);
        pushToast('关键词检查完成', 'success');
        appendLog('关键词巡检完成。', 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
      appendLog(`关键词巡检失败: ${error.message}`, 'error');
    }
  }

  async function addDomain() {
    const name = domainInput.trim();
    if (!name) return;

    try {
      await withBusy('addDomain', async () => {
        await api('/domains', { method: 'POST', body: { name } });
        setDomainInput('');
        await Promise.all([loadDomains(), loadStatus()]);
        pushToast(`已添加领域: ${name}`, 'success');
        appendLog(`新增热点领域: ${name}`, 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
    }
  }

  async function toggleDomain(id, enabled) {
    await api(`/domains/${id}`, { method: 'PUT', body: { enabled } });
    await Promise.all([loadDomains(), loadStatus()]);
  }

  async function deleteDomain(id) {
    await api(`/domains/${id}`, { method: 'DELETE' });
    await Promise.all([loadDomains(), loadStatus(), loadHotTopics(domainFilter)]);
    pushToast('领域已删除', 'info');
  }

  async function triggerHotspotCollect() {
    try {
      await withBusy('collect', async () => {
        appendLog('手动触发热点采集。', 'info');
        await api('/domains/collect', { method: 'POST', body: {} });
        await Promise.all([loadStatus(), loadHotTopics(domainFilter), loadNotifications(), loadRecentTopics()]);
        pushToast('热点收集完成', 'success');
        appendLog('热点采集完成。', 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
      appendLog(`热点采集失败: ${error.message}`, 'error');
    }
  }

  async function executeSearch() {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      await withBusy('search', async () => {
        const { data } = await api('/search', {
          method: 'POST',
          body: { query, sources: searchSources },
        });
        setSearchResults(
          data.map((item) => ({
            title: item.title,
            summary: item.text || item.summary || '',
            source: item.source,
            source_url: item.url,
            source_engine: item.sourceEngine,
            source_domain: item.sourceDomain,
            rule_score: item.ruleScore || item.rule_score || 0,
            cross_source_count: item.crossSourceCount || item.cross_source_count || 1,
            score: (item.ai_confidence || 0) * 100,
            created_at: item.timestamp,
          })),
        );
        appendLog(`完成检索: ${query}，共返回 ${data.length} 条。`, 'success');
      });
    } catch (error) {
      pushToast(error.message, 'error');
      appendLog(`搜索失败: ${error.message}`, 'error');
    }
  }

  async function markAllRead() {
    await api('/notifications/read', { method: 'POST', body: {} });
    await Promise.all([loadNotifications(), loadStatus()]);
    pushToast('未读通知已清空', 'success');
  }

  async function saveSettings() {
    try {
      await withBusy('saveSettings', async () => {
        const payload = {
          smtp_host: settings.smtp_host || '',
          smtp_port: settings.smtp_port || '',
          smtp_user: settings.smtp_user || '',
          smtp_pass: settings.smtp_pass || '',
          notify_email: settings.notify_email || '',
        };
        await api('/settings', { method: 'POST', body: { settings: payload } });
        pushToast('设置已保存', 'success');
        appendLog('通知设置已更新。', 'success');
        await loadSettings();
      });
    } catch (error) {
      pushToast(error.message, 'error');
    }
  }

  const metricCards = [
    {
      kicker: 'Monitor',
      title: '关键词哨兵',
      value: String(status.keywords).padStart(2, '0'),
      description: '持续盯住你最在意的产品、模型、发布节奏与异常信号。',
      link: '#keywords-panel',
    },
    {
      kicker: 'Radar',
      title: '热点追踪面',
      value: String(status.domains).padStart(2, '0'),
      description: '把 AI 编程相关领域拆成追踪面，第一时间捕捉可传播的增量信息。',
      link: '#hotspots-panel',
    },
    {
      kicker: 'Verified',
      title: '有效热点池',
      value: String(status.topics).padStart(2, '0'),
      description: '多源聚合后再过 AI 验证，避免把时间浪费在无效噪声上。',
      link: '#dashboard-panel',
    },
    {
      kicker: 'Alert',
      title: '待处理通知',
      value: String(status.unread).padStart(2, '0'),
      description: '浏览器与邮件双链路就绪，重要内容不该晚你一步。',
      link: '#notifications-panel',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(108,247,214,0.18),transparent_55%)]" />

      <HeaderBar
        notifRef={notifRef}
        status={status}
        unreadNotifications={unreadNotifications}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        refreshOverview={refreshOverview}
        markAllRead={markAllRead}
        busy={busy}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <HeroSection
          status={status}
          settings={settings}
          heroTopic={heroTopic}
          keywordTopics={keywordTopics}
          unreadNotifications={unreadNotifications}
          metricCards={metricCards}
          onOpenSearch={() => switchTab('search')}
          onOpenKeywords={() => switchTab('keywords')}
        />

        <TabNav tabs={tabs} activeTab={activeTab} onSelect={switchTab} />

        {activeTab === 'dashboard' ? (
          <DashboardPanel recentTopics={recentTopics} logs={logs} refreshOverview={refreshOverview} busy={busy} status={status} />
        ) : null}

        {activeTab === 'keywords' ? (
          <KeywordsPanel
            keywordInput={keywordInput}
            setKeywordInput={setKeywordInput}
            addKeyword={addKeyword}
            busy={busy}
            triggerKeywordCheck={triggerKeywordCheck}
            keywords={keywords}
            toggleKeyword={toggleKeyword}
            deleteKeyword={deleteKeyword}
            keywordTopics={keywordTopics}
          />
        ) : null}

        {activeTab === 'hotspots' ? (
          <HotspotsPanel
            domainInput={domainInput}
            setDomainInput={setDomainInput}
            addDomain={addDomain}
            busy={busy}
            triggerHotspotCollect={triggerHotspotCollect}
            domains={domains}
            toggleDomain={toggleDomain}
            deleteDomain={deleteDomain}
            domainFilter={domainFilter}
            setDomainFilter={setDomainFilter}
            hotTopics={hotTopics}
          />
        ) : null}

        {activeTab === 'search' ? (
          <SearchPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchSources={searchSources}
            setSearchSources={setSearchSources}
            executeSearch={executeSearch}
            busy={busy}
            searchResults={searchResults}
          />
        ) : null}

        {activeTab === 'notifications' ? (
          <NotificationsPanel notifications={notifications} markAllRead={markAllRead} />
        ) : null}

        {activeTab === 'settings' ? (
          <SettingsPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} busy={busy} />
        ) : null}
      </main>

      <div className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              toast.type === 'error'
                ? 'rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-rose-100 shadow-xl shadow-black/30 backdrop-blur-xl'
                : toast.type === 'success'
                  ? 'rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-emerald-50 shadow-xl shadow-black/30 backdrop-blur-xl'
                  : 'rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sky-50 shadow-xl shadow-black/30 backdrop-blur-xl'
            }
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;