const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const { filterReliableResults } = require('./reliability');

async function callAI(systemPrompt, userPrompt, jsonMode = true) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zy-hot-monitor.local',
      'X-Title': 'ZY Hot Monitor'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (jsonMode) {
    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1].trim());
      throw new Error('AI returned invalid JSON: ' + content.substring(0, 200));
    }
  }
  return content;
}

/**
 * Verify if search results are genuinely related to the keyword
 * Filter out clickbait, fake news, and irrelevant content
 */
async function verifyResults(keyword, results) {
  if (!results.length) return [];

  const systemPrompt = `你是一个专业的信息验证AI。你的任务是判断搜索结果是否真实地与给定的关键词相关。
你需要过滤掉：
1. 标题党/诱导性标题（与实际内容不符）
2. 假冒/虚假内容（伪造的新闻、公告等）
3. 与关键词无实质关联的内容（只是随便提到了关键词）
4. 过时的旧闻重发
5. 低质量社媒噪音，例如随手回复、上下文不足的短帖、互动极低的帖子

对每个结果返回 JSON 数组，每项包含：
- index: 原始索引
- is_genuine: 是否真实相关 (boolean)
- confidence: 置信度 0-1
- reason: 简短判断理由`;

  const userPrompt = `关键词: "${keyword}"

搜索结果:
${results.map((r, i) => `[${i}] 标题: ${r.title}\n来源: ${r.source}\n来源引擎: ${r.sourceEngine || ''}\n站点: ${r.sourceDomain || ''}\n规则分: ${r.ruleScore || r.rule_score || 0}\n内容: ${(r.text || r.summary || '').substring(0, 300)}\nURL: ${r.url || ''}`).join('\n\n')}

请以JSON格式返回 {"results": [...]}`;

  try {
    const resp = await callAI(systemPrompt, userPrompt);
    const verified = resp.results || [];
    return results.map((r, i) => {
      const v = verified.find(v => v.index === i);
      return {
        ...r,
        is_verified: v ? v.is_genuine : false,
        ai_confidence: v ? v.confidence : 0,
        ai_reason: v ? v.reason : '未验证'
      };
    }).filter(r => r.is_verified && r.ai_confidence >= 0.6 && (r.ruleScore || r.rule_score || 0) >= 45);
  } catch (err) {
    console.error('AI verify error:', err.message);
    return filterReliableResults(results, { mode: 'keyword' }).slice(0, 12).map((result) => ({
      ...result,
      is_verified: true,
      ai_confidence: Math.max(0.55, (result.ruleScore || result.rule_score || 0) / 100),
      ai_reason: 'AI 不可用，使用规则评分兜底保留',
    }));
  }
}

/**
 * Analyze and score hot topics from raw search results
 */
async function analyzeHotTopics(domain, results) {
  if (!results.length) return [];

  const systemPrompt = `你是一个专业的科技热点分析AI。你的任务是从搜索结果中提炼出有价值的热点话题。

对每个热点话题，你需要：
1. 生成简洁有力的中文标题
2. 写一段50-100字的摘要
3. 评估热度分数(0-100)，考虑因素：话题新鲜度、影响范围、讨论热度
4. 合并重复/相似的话题

返回JSON格式 {"topics": [{"title": "...", "summary": "...", "score": 85, "sources": [原始索引数组]}]}
限制最多返回10个热点，按score降序排列。`;

  const userPrompt = `领域: "${domain}"

原始搜索结果:
${results.map((r, i) => `[${i}] ${r.title}\n${(r.text || r.summary || '').substring(0, 300)}\n来源: ${r.source} | 引擎: ${r.sourceEngine || ''} | 站点: ${r.sourceDomain || ''} | 规则分: ${r.ruleScore || r.rule_score || 0} | ${r.url || ''}`).join('\n\n')}

请分析并提炼热点话题：`;

  try {
    const resp = await callAI(systemPrompt, userPrompt);
    return (resp.topics || []).map(topic => ({
      ...topic,
      source_items: (topic.sources || []).map(i => results[i]).filter(Boolean)
    }));
  } catch (err) {
    console.error('AI analyze error:', err.message);
    return filterReliableResults(results, { mode: 'hotspot' }).slice(0, 6).map((result, index) => ({
      title: result.title,
      summary: (result.text || result.summary || '').substring(0, 120),
      score: Math.max(result.ruleScore || result.rule_score || 0, 50 - index * 2),
      sources: [results.indexOf(result)].filter((value) => value >= 0),
      source_items: [result],
    }));
  }
}

module.exports = { callAI, verifyResults, analyzeHotTopics };
