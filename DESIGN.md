# 🔥 热点监控系统 (zy-hot-monitor) - 设计方案

## 技术栈

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| 后端 | Node.js + Express | 轻量敏捷，快速开发 |
| 前端 | 原生 HTML/CSS/JS (单页) | 无需构建工具，响应式设计 |
| AI | OpenRouter API (google/gemini-2.0-flash-001) | 便宜快速，用于内容真假识别和热点分析 |
| 数据源 | 网页搜索爬取 + Twitter(X) API (twitterapi.io) | 多信息源聚合，覆盖面广 |
| 存储 | SQLite (better-sqlite3) | 轻量持久化，无需数据库服务 |
| 通知 | 浏览器 Notification API + 邮件 (nodemailer) | 双通道即时提醒 |
| 定时任务 | node-cron | 定时轮询检查 |

## 核心架构

```
┌─────────────────────────────────────────────────────┐
│                   Web Frontend                       │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐   │
│  │ 关键词     │  │ 热点面板   │  │ 通知中心       │   │
│  │ 监控管理   │  │ 实时展示   │  │ 浏览器+邮件推送│   │
│  └───────────┘  └───────────┘  └────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────┐
│                  Express Server                      │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ 多源搜索    │  │ AI 分析    │  │ 定时调度器     │  │
│  │ 网页爬取    │  │ OpenRouter │  │ node-cron     │  │
│  │ Twitter API │  │            │  │               │  │
│  └────────────┘  └────────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │            SQLite 存储层                      │   │
│  │  keywords | hot_topics | notifications       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 功能模块

### 1. 关键词监控
- 用户添加关键词 → 系统每 **10 分钟**自动搜索
- **多信息源并行**：同时从网页搜索和 Twitter(X) 获取结果
- AI 鉴别真假内容（过滤标题党/假冒内容）
- 命中则通过**浏览器推送 + 邮件**双通道通知

### 2. 热点自动收集
- 用户设置感兴趣的领域（如"AI编程"）
- 每 **30 分钟**自动从多个信息源抓取热点
- AI 对热点进行摘要、打分、去重
- 结果展示在面板上

### 3. 通知系统
- **浏览器通知**：原生 Notification API（需用户授权）
- **邮件通知**：通过 nodemailer 发送，支持用户配置 SMTP
- 页面内通知中心，历史记录可查

## 数据源策略

| 数据源 | 方式 | 说明 |
|--------|------|------|
| 网页搜索 | 后端爬取搜索引擎页面 | 免费，无需 API Key，注意控制频率 |
| Twitter(X) | twitterapi.io REST API | 付费 API，$0.15/1k tweets，实时性强 |

> 多源聚合策略：两个信息源并行发起请求，结果合并后交给 AI 去重、打分、排序。

## 前端设计风格

- **赛博朋克风格**：暗色主题 + 霓虹渐变 + 毛玻璃卡片 + 动态粒子背景
- 数据以「信息流 + 卡片」形式呈现，类似命令行终端视觉效果
- 响应式适配移动端（CSS Media Query）
- UI 要足够独特，避免千篇一律

## API Key 配置

| 服务 | 环境变量 | 说明 |
|------|---------|------|
| OpenRouter | `OPENROUTER_API_KEY` | AI 内容分析 |
| TwitterAPI.io | `TWITTER_API_KEY` | Twitter 数据获取 |
| 邮件 SMTP | `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | 邮件通知 |

## 开发步骤

| 步骤 | 内容 | 产出文件 |
|------|------|---------|
| **Step 1** | 项目初始化 + 后端骨架 + 数据库 | `package.json`, `server.js`, `src/db.js` |
| **Step 2** | 多源搜索模块（网页爬取 + Twitter API） | `src/services/search.js`, `src/services/twitter.js` |
| **Step 3** | AI 分析模块（OpenRouter 接入） | `src/services/ai.js` |
| **Step 4** | 定时任务 + 关键词监控 + 热点收集 | `src/services/monitor.js`, `src/services/hotspot.js` |
| **Step 5** | 前端页面（赛博朋克风格响应式） | `public/index.html` |
| **Step 6** | 邮件通知功能 | `src/services/email.js` |
| **Step 7** | 功能测试验证 | 启动服务，端到端测试 |
| **Step 8** | Agent Skills 封装 | `agent-skill/SKILL.md` |

> **注意**：先完成网页版、确保功能正常使用之后，再开发 Agent Skills。

## 数据库表设计

```sql
-- 监控关键词
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 热点话题
CREATE TABLE hot_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,          -- 'web' | 'twitter'
  source_url TEXT,
  score REAL DEFAULT 0, -- AI 打分
  domain TEXT,          -- 所属领域
  is_verified INTEGER DEFAULT 0, -- AI 验证真实性
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 通知记录
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER,
  topic_id INTEGER,
  type TEXT,            -- 'keyword_hit' | 'hot_topic'
  channel TEXT,         -- 'browser' | 'email'
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES keywords(id),
  FOREIGN KEY (topic_id) REFERENCES hot_topics(id)
);

-- 用户设置
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```
