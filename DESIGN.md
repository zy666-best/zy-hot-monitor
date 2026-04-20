# 热点监控系统 (zy-hot-monitor) - 现状设计说明

## 项目目标

项目用于持续监控关键词和领域热点，尽量用低成本的数据源完成以下几件事：

- 追踪指定关键词的新增讨论和相关资讯
- 按领域自动收集可继续跟进的热点话题
- 在网页端集中查看、筛选、核验、通知和回溯历史结果
- 在 AI 不可用或部分外部源失败时，仍然保持可用的规则化兜底链路

当前实现重点是“多源聚合 + 规则过滤 + AI 增强 + 可观测调试”，而不是单纯做一个网页抓取器。

## 当前技术栈

| 层级 | 技术选型 | 当前状态 |
|------|---------|---------|
| 后端 | Node.js + Express 5 | `server.js` 提供 REST API、静态资源服务、SSE 通知流 |
| 前端 | React 19 + Vite 8 | 前端已从原生单页迁移为组件化应用 |
| UI | 自定义组件 + Motion + Lucide | 科技感信息面板风格，支持多 Tab 管理视图 |
| AI | OpenRouter API（多模型降级链） | 4模型降级链：Gemma 4 31B → MiniMax M2.5 → Nemotron 3 Super → Gemma 4 26B；失败时有规则兜底 |
| 存储 | `sql.js` + 本地文件持久化 | 数据文件位于 `data/hot-monitor.db` |
| 搜索源 | DuckDuckGo、Bing、Bing News、优先站点查询、Bilibili、Twitter | 均已接入到当前后端搜索链路 |
| 通知 | 浏览器通知 + 邮件 (`nodemailer`) + SSE | 页面内通知中心可查历史 |
| 定时任务 | `node-cron` | 负责关键词巡检与领域热点收集 |

## 当前架构

```text
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  Keywords | Hotspots | Search | Notifications | Settings    │
│  Settings  | Source Filters | Result Cards | Live Updates   │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API / SSE
┌──────────────────────────────┴──────────────────────────────┐
│                       Express Server                         │
│  API Routes  | Search Orchestration | AI Verification       │
│  Hotspot Flow| Keyword Monitor      | Notification Stream    │
└───────────────┬──────────────────────┬───────────────────────┘
                │                      │
      ┌─────────▼─────────┐  ┌────────▼────────┐
      │ Search Services    │  │ Reliability     │
      │ DDG / Bing / News  │  │ Dedup / Score   │
      │ Priority Sites     │  │ Filter / Fallback│
      │ Bilibili / Twitter │  │ Language / Trust │
      └─────────┬─────────┘  └────────┬────────┘
                │                      │
          ┌─────▼──────────────────────▼─────┐
          │         sql.js Persistence         │
          │ keywords | domains | hot_topics    │
          │ notifications | settings           │
          └────────────────────────────────────┘
```

## 前端设计现状

前端已经不是最初的原生 HTML/CSS/JS 单页，而是基于 React + Vite 的多面板控制台。

### 主要页面

- 关键词监控：增删改关键词、手动触发巡检、查看关键词命中结果
- 热点追踪：增删改领域、手动触发热点收集、按领域查看热点排序
- 快速核验：手动输入查询词，按指定数据源做一次即时核验
- 通知中心：浏览器通知与历史记录
- 设置：SMTP、AI、Twitter 等能力状态查看与配置；AI 相关性评估面板

### 页面布局

- Hero Section 展示在所有 Tab 上方，包含系统状态 badge、热点快照卡片、统计面板
- 顶部 Header 右侧展示紧凑状态 pill：运行时长、AI 在线/离线、Twitter 在线/离线、巡检节奏
- 关键词监控和热点追踪面板均附带功能说明文字，帮助用户理解两者区别

### 当前 UI 特征

- 卡片化布局和分栏式控制台结构，最大宽度 1920px
- 所有面板采用垂直堆叠布局（top-down），取代早期左右分栏
- 支持结果元数据展示：来源、来源引擎、站点、AI 置信度、规则分、多源命中数
- 热点页和搜索页都能直接看到来源细节，便于人工判断质量
- 结果卡片展示互动数据（点赞、转发、评论、浏览量）
- AI 分析理由支持展开/收起，可全局切换
- 摘要来源标签（AI 摘要 / 原始摘要）
- 作者信息行（账号名、粉丝数）
- 原始发布时间展示
- 关键词高亮（标题和摘要中的匹配词）
- 多源命中详情 hover 弹出（引擎列表和站点列表）
- 认证标识（verified badge）和语言标签
- 所有面板配备共享排序/筛选工具栏（排序：最新/最早/AI 置信度/规则分；筛选：时间范围/来源类型/搜索引擎/站点域名/语言/最低分数）
- 自定义下拉菜单组件替代原生 `<select>`，统一视觉风格
- 面板文案精简化，去除冗余描述文字，保持极简风格
- 滚动条宽度 14px，便于操作

## 核心功能模块

### 1. 关键词监控

- 从 `keywords` 表中读取启用中的关键词
- 使用网页聚合搜索和 Twitter 搜索并行拉取结果
- 先经过规则过滤，再调用 AI 验证真实性和相关性
- AI 失败时，回退到规则评分保留策略
- 新结果写入 `hot_topics`，并生成浏览器通知和邮件通知

对应实现：`src/services/monitor.js`

### 2. 热点自动收集

- 从 `domains` 表中读取启用中的领域
- 针对每个领域执行热点收集流程
- 领域之间已改为并行收集，降低总体等待时间
- 聚合网页搜索、Twitter 搜索、Twitter 趋势中的相关结果
- 先做规则过滤，再做 AI 热点提炼；AI 不可用时退回规则热点

对应实现：`src/services/hotspot.js`

### 3. 快速核验

- 手动输入一个查询词
- 自由选择具体数据源，而不是只有“网页 / Twitter”两个粗粒度选项
- 当前支持的数据源选项：
  - 网页聚合
  - DuckDuckGo
  - Bing 网页
  - Bing News
  - 国内优先站点
  - Bilibili
  - Twitter / X
- 统一经过规则过滤和 AI 验证后返回前端展示

对应实现：`frontend/src/App.jsx`、`frontend/src/components/panels/search-panel.jsx`、`server.js`

### 4. 通知系统

- 浏览器通知通过 SSE 推送到前端
- 邮件通知通过 SMTP 配置发送
- 页面内通知中心保存历史并支持已读处理
- 支持一键清空全部通知历史（`POST /api/notifications/delete-all`）
- 通知页面展示条数限制在 100 条以内

### 5. 调试与可观测性

已新增结构化调试日志模块 `src/services/debug-log.js`，用于输出：

- 原始来源分布
- 原始合并结果
- 规则过滤后的结果
- AI 验证或热点提炼后的结果

这样在排查“为什么没搜到”“为什么被过滤掉”“为什么热点页为空”时，不必盲猜。

## 搜索源设计

### 当前后端可用搜索源

| 搜索源 | 实现方式 | 说明 |
|------|---------|------|
| DuckDuckGo | HTML 页面抓取 | 免费，无需 Key |
| Bing 网页 | HTML 页面抓取 | 免费，无需 Key |
| Bing News | 新闻搜索页面抓取 | 用于补足资讯类内容 |
| Priority Sites | Bing `site:` 组合查询 | 用于提升国内站点曝光率 |
| Bilibili | 直连 B 站搜索接口 | 已接入 `wbi/search/type` 视频搜索 |
| Twitter / X | `twitterapi.io` | 需要配置 `TWITTER_API_KEY` |

### 国内优先站点策略

当前优先站点组包括：

- `bilibili.com`
- `weibo.com`
- `36kr.com`
- `sspai.com`
- `jiqizhixin.com`
- `qbitai.com`

注意：微博目前仍主要依赖优先站点搜索命中，尚未接入独立微博搜索链路；Bilibili 已新增独立搜索源。

## 结果可靠性策略

这是本项目近几轮优化的核心。

### `src/services/reliability.js` 提供的能力

- HTML 清洗与标题归一化
- URL 归一化与跟踪参数清理
- 语言识别（中文、英文、混合）
- 来源类型推断（web、news、social）
- 可信域名白名单识别
- 跨源去重合并
- 规则评分
- 关键词模式 / 热点模式的差异化过滤

### 评分考虑因素

- 标题与正文长度
- 时效性
- 来源类型
- 来源域名可信度
- 社交信号强弱
- 是否疑似低质量短回复、无上下文噪声等

### AI 失败时的兜底策略

项目不再采用“AI 出错就把所有原始结果都放出来”的做法，而是：

- 关键词核验：保留规则分足够高的候选结果，并附带兜底置信度
- 热点提炼：按规则分选出前几条作为热点候选

这样即使 `OPENROUTER_API_KEY` 未配置、模型不可用或地区受限，系统仍可工作。

## 数据库设计

当前数据库由 `src/db.js` 初始化，并在启动时执行轻量 schema migration。

### 关键数据表

```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

CREATE TABLE hot_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  source_url TEXT,
  score REAL DEFAULT 0,
  domain TEXT,
  is_verified INTEGER DEFAULT 0,
  keyword_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (keyword_id) REFERENCES keywords(id)
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  type TEXT,
  channel TEXT,
  title TEXT,
  content TEXT,
  is_read INTEGER DEFAULT 0,
  sent_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (topic_id) REFERENCES hot_topics(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### `hot_topics` 的扩展字段

启动时会自动补齐以下字段，用于增强可解释性和筛选能力：

- `source_type`
- `source_engine`
- `source_domain`
- `language`
- `rule_score`
- `cross_source_count`
- `ai_reason`：AI 分析理由文本
- `summary_type`：摘要来源标记（`original` / `ai`）
- `published_at`：原始发布时间
- `author`：作者 ID / 账号
- `author_name`：作者显示名称
- `author_followers`：作者粉丝数
- `likes`：点赞数
- `retweets`：转发数
- `replies`：评论 / 回复数
- `views`：浏览量
- `source_engines`：多源命中引擎列表（逗号分隔）
- `source_domains`：多源命中站点列表（逗号分隔）

## 关键 API 约定

### 主题查询

`GET /api/topics`

支持的主要查询参数：

- `type=hotspot`：只返回领域热点
- `type=keyword`：只返回关键词命中
- `domain=xxx`：按领域过滤
- `keyword=xxx`：按关键词过滤
- `limit=n`：限制返回数量（总览页默认 100 条）

这部分逻辑已经修复为"在后端先分流再 limit"，避免热点被关键词记录挤掉。

### 通知管理

- `GET /api/notifications`：获取通知列表（后端 LIMIT 100）
- `POST /api/notifications/read`：标记已读（传 `ids` 数组或空对象全部已读）
- `POST /api/notifications/delete-all`：清空全部通知历史

### 手动搜索

`POST /api/search`

请求体支持：

```json
{
  "query": "AI编程",
  "sources": ["web", "bilibili", "twitter"]
}
```

后端会按所选数据源逐一执行，再统一去重、过滤和 AI 验证。

## 历次优化摘要

### 第一轮：基础架构与搜索链路

#### 1. 前端架构与交互层优化

- 将旧的静态单页方案升级为 React + Vite 组件化前端
- 重构为总览、关键词、热点、快速核验、通知、设置等多页签结构
- 搜索结果与热点卡片增加来源、来源引擎、站点、规则分、多源命中等元数据展示
- 快速核验页签补齐所有后端已支持的数据源选项

#### 2. 搜索源扩展

- 移除在中国大陆访问成功率较低的 Google News RSS
- 保留 DuckDuckGo、Bing、Bing News 作为通用免费搜索源
- 增加优先站点搜索，提升国内站点命中概率
- 新增 Bilibili 独立搜索源，并接入现有聚合搜索链路

#### 3. 结果质量与保守过滤

- 新增 `fetch-utils.js`，统一处理超时与缓存
- 新增 `reliability.js`，做可信域名、低质量内容、语言、去重、评分、过滤
- 对 Twitter 结果增加更保守的过滤，减少低质量回复和上下文不足的短帖
- AI 不可用时改为规则兜底，不再无脑放出全部原始结果

#### 4. 热点收集链路优化

- 热点收集由串行改为领域并行，缩短等待时间
- 手动热点收集接口从二十多秒缩短到大约五秒级别
- 修复热点排序页数据错误：过去“最近 50 条 topics 再前端过滤”的策略会导致热点被关键词记录挤掉；现已改为后端通过 `type=hotspot` / `type=keyword` 直接分流

#### 5. 调试与排障能力增强

- 为手动搜索、关键词巡检、热点收集加入结构化 debug 日志
- 可以直接观察原始结果、过滤结果和最终结果，便于定位"没搜到""被过滤掉""热点不显示"等问题

### 第二轮：前端交互增强与视觉优化

#### 1. 多维排序与筛选系统

- 新增共享 `useTopicFilters` hook 和 `TopicFilterBar` 组件（`frontend/src/components/shared/topic-filters.jsx`）
- 四个面板（关键词/热点/搜索/设置）统一接入排序筛选
- 排序支持：最新优先、最早优先、AI 相关度、规则分
- 筛选支持：时间范围（1h/今天/3天/7天）、来源类型、搜索引擎、站点域名、语言、最低分数阈值
- 自定义 `SelectFilter` 下拉菜单组件替代原生 `<select>`，支持 click-outside 关闭
- AI 置信度标签（紫色 badge）加入 `TopicList` 结果卡片元数据行

#### 2. 布局与视觉优化

- 所有面板从左右分栏改为垂直堆叠布局（`space-y-6`）
- 容器最大宽度从 `max-w-7xl` 扩展至 `max-w-[1920px]`
- Hero Section 重构：去掉大标题，改为水平布局（左 badge 右按钮），热点快照卡与统计面板左右两栏
- 面板文案极简化：去掉所有冗余描述、副标题、helper 文字
- `PanelShell`、`StatusCard`、`MiniPanel` 组件在 description/helper 为空时不渲染空 `<p>` 标签
- 滚动条宽度从 8px 加至 14px

#### 3. 通知中心增强

- 新增「清空全部」按钮，调用 `POST /api/notifications/delete-all` 清空 notifications 表
- 通知页面展示限制 100 条，超出时底部提示总数
- 总览热点流 API 请求限制为 100 条

#### 4. Bug 修复

- 修复总览页「最新热点流」排序和时间范围过滤不生效的问题：API limit 从 12 提升至 100，`parseDate` 增加空值和 Invalid Date 保护

### 第三轮：AI 相关性优化与 UI 精简

#### 1. AI 相关性分析重构

- `verifyResults()` 重写：从单一 `confidence` 改为双维度评估（`confidence` 真实性 + `relevance` 语义相关度），过滤条件 `is_genuine && confidence >= 0.6 && relevance >= 0.7 && ruleScore >= 45`
- `analyzeHotTopics()` 重写：新增 `relevance`（0-100）和 `reason` 字段，综合分 = `heat * 0.4 + relevance * 0.6`，过滤 `relevance < 50`
- AI 验证的 prompt 要求 `reason` 必须说明内容与关键词之间的具体关联，而非泛泛描述内容本身
- 前端标签从"AI 置信度"更名为"AI 相关度"

#### 2. Query Expansion（查询扩展）

- 新增 `expandQuery(keyword)` 函数，通过 AI 生成 3-5 个语义变体查询
- 关键词监控和热点追踪均接入查询扩展，搜索所有变体后合并结果
- 对有歧义的关键词（如"DNF"），prompt 约束只取最主流含义的变体

#### 3. AI 超时与兜底策略

- `callAI()` 增加 `AbortSignal.timeout()`，单模型 45s、总预算 90s
- AI 超时或不可用时，自动回退到规则评分系统做搜索结果过滤
- 规则评分兜底增加关键词文本匹配加分：标题含关键词 +12，正文含关键词 +6

#### 4. AI 模型列表更新

- 移除 `openai/gpt-4o-mini`（区域 403 不可用）和 `openrouter/free`（元模型易 429）
- 新模型降级链：`google/gemma-4-31b-it:free` → `minimax/minimax-m2.5:free` → `nvidia/nemotron-3-super-120b-a12b:free` → `google/gemma-4-26b-a4b-it:free`

#### 5. AI 评估机制

- 新增 `src/services/eval.js`：10 个测试用例覆盖强相关、弱相关、无关、标题党、旧闻、低质量社媒、查询扩展变体
- `runRelevanceEval()` 逐例调用 `verifyResults()`，比对预期结果，输出准确率/误报率/漏报率
- 后端新增 `POST /api/eval/relevance` 路由
- 设置页新增"AI 相关性评估"面板，支持一键运行并展示详细结果

#### 6. Bilibili 搜索结果修复

- `search.js` 中 `toResult()` 函数签名扩展，正确传递 `author`、`authorName`、`views`、`likes`、`replies`、`retweets`、`authorFollowers`
- Bilibili 搜索结果 `text` 字段从拼接式 `textParts.join(' | ')` 改为 `item.description || ''`，修复页面显示乱码

#### 7. 总览页移除与状态信息重定位

- 移除「总览」Tab 及 `DashboardPanel` 组件的渲染
- 默认页签从 `dashboard` 改为 `keywords`
- 运转状态信息（服务状态、AI 在线、Twitter 在线、巡检节奏）重新以紧凑 pill 形式集成到 Header 右侧
- 状态 pill 带颜色区分：在线为绿色/紫色/蓝色，离线为灰色

#### 8. 面板说明文字

- 关键词监控面板：说明精确追踪特定事件、10 分钟巡检、AI 逐条验证保留原文
- 热点追踪面板：说明广域扫描领域趋势、30 分钟收集、AI 归纳提炼生成摘要
- 帮助用户理解两个功能的定位差异（精确监听 vs 趋势雷达）

## 运行与构建

常用命令：

- `npm start`：启动后端并托管 `public/` 下的前端产物
- `npm run dev`：后端 watch 模式
- `npm run dev:client`：本地启动 Vite 前端开发服务
- `npm run build:client`：构建前端到 `public/`

## 环境变量

| 服务 | 环境变量 | 用途 |
|------|---------|------|
| OpenRouter | `OPENROUTER_API_KEY` | AI 内容验证与热点分析 |
| Twitter API | `TWITTER_API_KEY` | Twitter 搜索与趋势 |
| SMTP | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 邮件通知 |
| 通知邮箱 | `NOTIFY_EMAIL` | 热点和关键词通知接收地址 |

## 已知边界

- Twitter 依赖外部配额和 Key，当前不足时会退化为网页源为主
- OpenRouter 免费模型在某些地区可能不可用（403），系统通过多模型降级链和规则兜底双重保障
- 微博尚未接入独立搜索实现，目前主要依赖优先站点搜索命中
- Bilibili 已接入独立搜索，但热点模式下是否进入最终结果仍受整体规则评分影响

### 第三轮：信息密度增强与 AI 可用性修复

#### 1. AI 多模型降级链

- 原单一模型 `openai/gpt-4o-mini` 在部分地区被 OpenRouter 封禁（403），账户无余额时付费模型返回 402
- 改造 `callAI()` 为多模型自动降级：`minimax/minimax-m2.5:free` → `openrouter/free` → `openai/gpt-4o-mini`
- 兼容 reasoning 模型格式：当 `content` 为 null 时，从 `message.reasoning` 字段提取 JSON
- JSON 提取增强：依次尝试直接解析、markdown 代码块提取、花括号匹配
- JSON mode 不再依赖 `response_format` 参数（部分免费模型不支持），改为 system prompt 追加 JSON 输出指令

#### 2. 数据库 schema 扩展（12 个新字段）

- `hot_topics` 表新增互动数据字段：`likes`、`retweets`、`replies`、`views`
- 新增作者信息字段：`author`、`author_name`、`author_followers`
- 新增内容元数据字段：`ai_reason`、`summary_type`、`published_at`
- 新增多源命中详情字段：`source_engines`、`source_domains`（逗号分隔字符串）
- 所有字段通过 `ensureColumn` 在启动时自动补齐，向后兼容

#### 3. 后端数据采集增强

- `monitor.js`：关键词巡检 INSERT 语句补齐所有新字段，`summary_type='original'`
- `hotspot.js`：热点收集 INSERT 补齐所有新字段，`summary_type='ai'`
- `search.js`：Bilibili 搜索提取独立字段（author、views、likes、replies）
- `reliability.js`：去重合并时输出 `sourceEngines` 和 `sourceDomains` 逗号分隔字符串

#### 4. 前端结果卡片信息密度提升

- `TopicList` 组件大幅重写（`frontend/src/components/shared/ui-kit.jsx`）
- 新增 `highlightText()` 函数，在标题和摘要中高亮匹配的关键词
- 新增 `compactNumber()` 函数和 `EngagementPill` 组件，展示互动数据（Heart/Repeat2/MessageCircle/Eye 图标）
- AI 分析理由行：展开/收起动画（AnimatePresence），全局「展开/收起全部理由」按钮
- 作者信息行：显示作者名称和粉丝数
- 摘要来源标签：AI 摘要标记为紫色 badge
- 原始发布时间显示
- 多源命中 hover tooltip：展示命中的搜索引擎和站点域名列表
- 认证标识和语言标签
- 三个面板（keywords-panel、hotspots-panel、search-panel）传入 `highlightKeyword` prop

## 后续建议

- 继续优化领域词的查询词模板，减少泛词导致的弱相关结果
- 如需进一步覆盖国内社媒，再评估是否单独接入微博搜索源
