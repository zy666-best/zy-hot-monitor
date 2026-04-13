---
name: hot-monitor
description: "AI编程热点监控技能。用于监控关键词、收集热点话题、搜索验证内容、管理通知。当用户想要了解AI编程领域的最新热点、监控特定技术关键词（如GPT-5、Claude、Cursor等）、查询热门话题、搜索技术新闻并AI验证真伪时，使用此技能。也适用于用户想要添加/管理监控关键词、查看热点排行、获取通知摘要等操作。即使用户没有明确提到'热点监控'，只要涉及AI/编程领域的新闻追踪、趋势查询、关键词警报，都应使用此技能。"
---

# 🔥 热点监控 Agent Skill

你可以通过此技能操作热点监控系统，帮助用户追踪AI编程领域的最新动态。

系统后端运行在 `http://localhost:3000`，所有操作通过运行 `agent-skill/scripts/` 下的脚本完成。

## 核心能力

| 能力 | 说明 | 脚本 |
|------|------|------|
| 查看系统状态 | 监控关键词数、领域数、热点数、未读通知 | `status.js` |
| 管理监控关键词 | 添加/删除/启停关键词 | `keywords.js` |
| 管理追踪领域 | 添加/删除/启停领域 | `domains.js` |
| 获取热点列表 | 按领域/关键词筛选热点话题 | `topics.js` |
| 搜索+AI验证 | 多源搜索（网页+Twitter），AI自动鉴别真假 | `search.js` |
| 触发手动检查 | 立即触发关键词检查或热点收集 | `trigger.js` |
| 通知管理 | 查看/标记已读通知 | `notifications.js` |
| 邮件设置 | 配置邮件通知的SMTP信息 | `settings.js` |

## 使用方法

所有脚本位于此技能的 `scripts/` 目录下，在终端中用 `node` 运行，传入操作名和参数。

### 1. 查看系统状态

```bash
node agent-skill/scripts/status.js
```

返回监控关键词数、追踪领域数、热点总数、未读通知数、API配置状态。

### 2. 关键词管理

```bash
# 列出所有关键词
node agent-skill/scripts/keywords.js list

# 添加关键词
node agent-skill/scripts/keywords.js add "GPT-5"

# 删除关键词（传入ID）
node agent-skill/scripts/keywords.js delete 3

# 启用/禁用关键词
node agent-skill/scripts/keywords.js toggle 3 off
node agent-skill/scripts/keywords.js toggle 3 on
```

### 3. 领域管理

```bash
# 列出所有追踪领域
node agent-skill/scripts/domains.js list

# 添加领域
node agent-skill/scripts/domains.js add "AI编程"

# 删除领域
node agent-skill/scripts/domains.js delete 2

# 启用/禁用
node agent-skill/scripts/domains.js toggle 2 off
```

### 4. 获取热点话题

```bash
# 最新50条热点
node agent-skill/scripts/topics.js

# 按领域筛选
node agent-skill/scripts/topics.js --domain "AI编程"

# 限制数量
node agent-skill/scripts/topics.js --limit 10

# 按关键词筛选
node agent-skill/scripts/topics.js --keyword "Claude"
```

### 5. 搜索+AI验证

```bash
# 搜索并用AI验证结果真伪
node agent-skill/scripts/search.js "Claude 4 发布日期"
```

返回经过AI验证的搜索结果，每条包含标题、摘要、来源、置信度。

### 6. 手动触发检查

```bash
# 立即检查所有启用的关键词
node agent-skill/scripts/trigger.js keywords

# 立即收集所有启用领域的热点
node agent-skill/scripts/trigger.js hotspots
```

### 7. 通知管理

```bash
# 查看所有通知
node agent-skill/scripts/notifications.js list

# 只看未读通知
node agent-skill/scripts/notifications.js unread

# 全部标为已读
node agent-skill/scripts/notifications.js read-all

# 标记特定通知为已读
node agent-skill/scripts/notifications.js read 1 2 3
```

### 8. 设置管理

```bash
# 查看当前设置
node agent-skill/scripts/settings.js show

# 配置邮件通知
node agent-skill/scripts/settings.js set smtp_host smtp.qq.com
node agent-skill/scripts/settings.js set smtp_port 465
node agent-skill/scripts/settings.js set smtp_user your@email.com
node agent-skill/scripts/settings.js set smtp_pass your_password
node agent-skill/scripts/settings.js set notify_email target@email.com
```

## 输出格式

所有脚本输出为结构化文本。热点话题的输出格式：

```
🔥 [分数] 标题
   摘要内容...
   来源: web | 链接: https://...
   时间: 2小时前
```

## 常见用户场景

| 用户说的 | 你应该做的 |
|---------|----------|
| "最近AI编程有什么热点？" | 运行 `topics.js --domain "AI编程" --limit 10` |
| "帮我监控Claude相关的新闻" | 运行 `keywords.js add "Claude"` |
| "搜一下GPT-5什么时候发布" | 运行 `search.js "GPT-5 发布时间"` |
| "有什么新通知？" | 运行 `notifications.js unread` |
| "立即刷新一下热点" | 运行 `trigger.js hotspots` |
| "系统运行得怎么样？" | 运行 `status.js` |
| "不想监控这个关键词了" | 先 `keywords.js list` 找到ID，再 `keywords.js delete <id>` |

## 前置条件

- 热点监控服务器需在 `http://localhost:3000` 运行
- 如果服务器未启动，在项目根目录执行 `node server.js` 启动
- 项目路径: `d:\ai_project\zy-hot-monitor`
