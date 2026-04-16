import { Cpu, Globe, Mail, Settings } from 'lucide-react';
import { ActionButton, PanelShell, SettingsInput, StatusCard } from '../shared/ui-kit';

export function SettingsPanel({ settings, setSettings, saveSettings, busy }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <PanelShell eyebrow="Status" title="接入状态" description="先确保关键链路通，再谈体验细节。">
        <div className="grid gap-3">
          <StatusCard icon={Cpu} label="OpenRouter" value={settings.openrouter_configured ? '已配置' : '未配置'} helper="用于 AI 验证与热点提炼" />
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
  );
}