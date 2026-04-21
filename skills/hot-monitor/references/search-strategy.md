# 搜索策略参考

本文档描述热点监控技能使用的四类免费搜索源，包括请求 URL 模板、内容提取方法和注意事项。

---

## 1. DuckDuckGo HTML 搜索

**类型**：网页聚合搜索  
**是否需要 Key**：否

### 请求方式

使用 `fetch_webpage` 工具获取以下 URL 的页面内容：

```
URL: https://html.duckduckgo.com/html/?q={编码后的查询词}
```

示例：
```
https://html.duckduckgo.com/html/?q=AI%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%83%AD%E7%82%B9
```

### 内容提取

从返回的 HTML 页面中提取搜索结果。每条结果结构如下：
- **标题**：`.result__title .result__a` 的文本内容
- **摘要**：`.result__snippet` 的文本内容
- **链接**：`.result__title .result__a` 的 `href` 属性

### 注意事项

- DuckDuckGo 对爬取有速率限制，每次查询间隔至少 1 秒
- 若返回空结果，可能是暂时被限流，换用 Bing 替代
- 优先用于英文或中英文混合查询

---

## 2. Bing 网页搜索

**类型**：网页搜索  
**是否需要 Key**：否（HTML 页面抓取，非 API）

### 请求方式

```
URL: https://www.bing.com/search?q={编码后的查询词}&setlang=zh-Hans&count=10
```

示例：
```
https://www.bing.com/search?q=AI%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%83%AD%E7%82%B9&setlang=zh-Hans&count=10
```

### 内容提取

从返回的 HTML 中提取：
- **标题**：`li.b_algo h2 a` 的文本内容
- **摘要**：`li.b_algo .b_caption p` 的文本内容
- **链接**：`li.b_algo h2 a` 的 `href` 属性

### 注意事项

- `setlang=zh-Hans` 参数优先返回中文内容
- Bing 对中文内容覆盖较好，是中文领域热点的主力搜索源
- 若页面结构解析失败，提取 `<h2>` 标签内的链接和文本作为备选

---

## 3. Bing News 新闻搜索

**类型**：新闻资讯  
**是否需要 Key**：否

### 请求方式

```
URL: https://www.bing.com/news/search?q={编码后的查询词}&setlang=zh-Hans
```

示例：
```
https://www.bing.com/news/search?q=AI%E5%A4%A7%E6%A8%A1%E5%9E%8B&setlang=zh-Hans
```

### 内容提取

从新闻搜索结果页面提取：
- **标题**：`a.title` 或 `a.news-card` 的文本
- **摘要**：最近的 `.snippet`、`.caption` 或 `.source` 元素文本
- **链接**：`a.title` 或 `a.news-card` 的 `href` 属性
- **时效性**：新闻源结果通常是最近 24-72 小时内的内容

### 注意事项

- Bing News 是**新闻类热点最重要的来源**，优先使用
- 新闻结果自带较高的可信度，评分时 `sourceType='news'` 加 28 分
- 优先查询"领域名 + 最新"、"领域名 + 进展"等新闻性查询词

---

## 4. Bilibili 视频搜索

**类型**：国内视频平台，科技/科普内容丰富  
**是否需要 Key**：否（直连接口）

### 请求方式

```
URL: https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword={编码后的查询词}&page=1
```

示例：
```
https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=AI%E5%A4%A7%E6%A8%A1%E5%9E%8B&page=1
```

返回 JSON 格式，数据路径：`data.result`（数组）

### 内容提取

每条结果提取以下字段：

| JSON 字段 | 含义 |
|-----------|------|
| `title` | 视频标题（可能含 HTML 高亮标签，需清洗） |
| `description` | 视频描述/摘要 |
| `arcurl` / `bvid` | 视频链接（优先用 `arcurl`，若无则拼接 `https://www.bilibili.com/video/{bvid}`） |
| `author` | UP 主名称 |
| `play` | 播放量 |
| `like` | 点赞数 |
| `review` | 评论数 |

### 注意事项

- Bilibili 标题常含 `<em>` 等 HTML 标签，提取后必须清除 HTML 标签
- 播放量（`play`）是重要的热度信号，播放量 > 1 万的视频优先级更高
- Bilibili 接口有时返回空结果（无 Cookie 状态下的限流），若失败跳过即可
- 适合"科技科普"、"产品评测"、"教程"类领域的热点发现

---

## 搜索变体策略

每个领域名生成以下类型的查询变体，在搜索时使用不同变体请求不同搜索源：

| 变体类型 | 示例（领域="AI大模型"） | 推荐搜索源 |
|----------|----------------------|-----------|
| 原始领域名 | `AI大模型` | Bing, Bilibili |
| + "热点/最新/动态" | `AI大模型 热点 2026` | Bing News |
| + "进展/新闻" | `大语言模型 最新进展` | Bing News, DuckDuckGo |
| 英文/缩写 | `LLM latest news` | DuckDuckGo |
| 子领域/关联词 | `GPT Claude Gemini` | Bing, DuckDuckGo |

目标：每次搜索触发 **3-5 次 fetch_webpage 调用**，覆盖至少 2 个搜索源。

---

## 错误处理

| 错误情况 | 处理方式 |
|----------|----------|
| fetch 超时 | 跳过该源，继续其他源 |
| 返回空结果 | 换另一个查询变体重试一次 |
| JSON 解析失败（Bilibili）| 跳过 Bilibili，不影响其他源 |
| 所有源均失败 | 告知用户网络问题，建议稍后重试 |
