import { CheckCircle, Cpu, FlaskConical, Globe, Loader2, Mail, Settings, XCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { ActionButton, PanelShell, SettingsInput, StatusCard } from '../shared/ui-kit';

export function SettingsPanel({ settings, setSettings, saveSettings, busy }) {
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalReport, setEvalReport] = useState(null);

  async function runEval() {
    setEvalRunning(true);
    setEvalReport(null);
    try {
      const res = await api('/eval/relevance', { method: 'POST' });
      setEvalReport(res.data);
    } catch (err) {
      setEvalReport({ error: err.message });
    } finally {
      setEvalRunning(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <PanelShell eyebrow="Status" title="接入状态" description="先确保关键链路通，再谈体验细节。">
          <div className="grid gap-3">
            <StatusCard icon={Cpu} label="OpenRouter" value={settings.openrouter_configured ? '已配置' : '未配置'} helper="用于 AI 相关性分析与热点提炼" />
            <StatusCard icon={Globe} label="Twitter API" value={settings.twitter_configured ? '已配置' : '未配置'} helper="用于补足实时性与社媒热度" />
            <StatusCard icon={Mail} label="邮件通知" value={settings.notify_email ? '已配置' : '待填写'} helper="适合高优先级提醒备份" />
          </div>
        </PanelShell>

        <PanelShell eyebrow="Configure" title="邮件通知设置" description="只保留必要字段，避免配置成本压过使用效率。">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsInput label="SMTP 服务器" value={settings.smtp_host} onChange={(value) => setSettings((current) => ({ ...current, smtp_host: value }))} placeholder="smtp.qq.com" />
            <SettingsInput label="SMTP 端口" value={settings.smtp_port} onChange={(value) => setSettings((current) => ({ ...current, smtp_port: value }))} placeholder="465" type="number" />
            <SettingsInput label="发件邮箱" value={settings.smtp_user} onChange={(value) => setSettings((current) => ({ ...current, smtp_user: value }))} placeholder="name@example.com" type="email" />
            <SettingsInput label="邮箱密码 / 授权码" value={settings.smtp_pass} onChange={(value) => setSettings((current) => ({ ...current, smtp_pass: value }))} placeholder="输入授权码" type="password" />
            <div className="md:col-span-2">
              <SettingsInput label="通知收件邮箱" value={settings.notify_email} onChange={(value) => setSettings((current) => ({ ...current, notify_email: value }))} placeholder="notify@example.com" type="email" />
            </div>
          </div>

          <div className="mt-6">
            <ActionButton icon={Settings} onClick={saveSettings} loading={busy.saveSettings}>
              保存设置
            </ActionButton>
          </div>
        </PanelShell>
      </div>

      {/* AI Relevance Evaluation */}
      <PanelShell eyebrow="Evaluation" title="AI 相关性评估" description="使用内置测试用例验证 AI 对内容相关性的判断准确度。">
        <div className="space-y-4">
          <ActionButton icon={evalRunning ? Loader2 : FlaskConical} onClick={runEval} loading={evalRunning}>
            {evalRunning ? '评估中…' : '运行相关性评估'}
          </ActionButton>

          {evalReport && !evalReport.error && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-2xl font-bold text-white">{evalReport.accuracy}%</p>
                  <p className="mt-1 text-xs text-slate-400">准确率</p>
                </div>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-200">{evalReport.passed}/{evalReport.total}</p>
                  <p className="mt-1 text-xs text-slate-400">通过</p>
                </div>
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-center">
                  <p className="text-2xl font-bold text-rose-200">{evalReport.falsePositives}</p>
                  <p className="mt-1 text-xs text-slate-400">误放</p>
                </div>
                <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-200">{evalReport.falseNegatives}</p>
                  <p className="mt-1 text-xs text-slate-400">误杀</p>
                </div>
              </div>

              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                {evalReport.details?.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-xs">
                    {d.verdict === 'pass' ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    ) : d.verdict === 'fail' ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    ) : (
                      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{d.label}</span>
                        <span className="text-slate-500">关键词: {d.keyword}</span>
                      </div>
                      <p className="mt-0.5 truncate text-slate-400" title={d.title}>{d.title}</p>
                      {d.reason && <p className="mt-1 text-slate-300">{d.reason}</p>}
                      {d.actual && (
                        <p className="mt-0.5 text-slate-500">
                          相关度: {d.actual.relevance} | 置信度: {d.actual.confidence}
                          {d.actual.ai_reason ? ` | ${d.actual.ai_reason.substring(0, 80)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evalReport?.error && (
            <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              评估失败: {evalReport.error}
            </div>
          )}
        </div>
      </PanelShell>
    </div>
  );
}