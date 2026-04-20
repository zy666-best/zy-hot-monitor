const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  'google/gemma-4-31b-it:free',
  'minimax/minimax-m2.5:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
];
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const { filterReliableResults } = require('./reliability');

/**
 * Query Expansion — ask AI to generate semantic variants for a keyword/domain.
 * Returns an array of expanded query strings (including the original).
 */
async function expandQuery(keyword) {
  const systemPrompt = `你是一个查询扩展（Query Expansion）专家。给定一个关键词或领域名称，生成 3 个语义相近但表述不同的变体查询。
要求：
- 保持原始关键词的领域和语境不变，只做同一含义下的表述变体
- 包含同义词、缩写、别名、中英文混合等变体
- 如果关键词有多个含义，只取最主流/最常见的那个含义
- 不要改变原始含义，只是换种说法
- 不要加入无关的泛化词

返回 JSON 格式 {"expansions": ["变体1", "变体2", ...]}`;

  const userPrompt = `关键词: "${keyword}"`;

  try {
    const resp = await callAI(systemPrompt, userPrompt);
    const expansions = resp.expansions || [];
    // Always include original keyword at the front
    const result = [keyword, ...expansions.filter(e => e && e !== keyword)];
    console.log(`[AI] Query expansion for "${keyword}": ${result.join(', ')}`);
    return result;
  } catch (err) {
    console.warn(`[AI] Query expansion failed for "${keyword}": ${err.message}`);
    return [keyword];
  }
}

async function callAI(systemPrompt, userPrompt, jsonMode = true) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Per-model timeout: 45s. Total across all models capped at 90s.
  const MODEL_TIMEOUT_MS = 45_000;
  const TOTAL_TIMEOUT_MS = 90_000;
  const totalStart = Date.now();
  let lastError = null;

  for (const model of MODELS) {
    // Check total timeout budget
    const elapsed = Date.now() - totalStart;
    if (elapsed >= TOTAL_TIMEOUT_MS) {
      lastError = new Error(`AI total timeout (${TOTAL_TIMEOUT_MS}ms) exceeded`);
      console.warn(`[AI] Total timeout exceeded after ${elapsed}ms, giving up`);
      break;
    }

    const remainingMs = Math.min(MODEL_TIMEOUT_MS, TOTAL_TIMEOUT_MS - elapsed);

    try {
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt + (jsonMode ? '\n\n重要：只返回纯 JSON，不要用 markdown 包裹，不要添加任何解释文字。' : '') },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://zy-hot-monitor.local',
          'X-Title': 'ZY Hot Monitor'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(remainingMs),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`OpenRouter API error ${res.status} [${model}]: ${errText}`);
        console.warn(`[AI] Model ${model} failed (${res.status}), trying next...`);
        continue;
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message || {};
      // Some models (reasoning models) put content in reasoning field, not content
      let content = message.content || '';
      if (!content && message.reasoning) {
        // Try to extract JSON from reasoning text
        const jsonMatch = message.reasoning.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) content = jsonMatch[1].trim();
      }

      if (!content) {
        lastError = new Error(`Model ${model} returned empty content`);
        console.warn(`[AI] Model ${model} returned empty content, trying next...`);
        continue;
      }

      if (jsonMode) {
        try {
          return JSON.parse(content);
        } catch {
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) return JSON.parse(match[1].trim());
          // Try to find first { ... } block
          const braceMatch = content.match(/\{[\s\S]*\}/);
          if (braceMatch) return JSON.parse(braceMatch[0]);
          lastError = new Error('AI returned invalid JSON: ' + content.substring(0, 200));
          console.warn(`[AI] Model ${model} returned invalid JSON, trying next...`);
          continue;
        }
      }
      return content;
    } catch (err) {
      lastError = err;
      console.warn(`[AI] Model ${model} error: ${err.message}, trying next...`);
      continue;
    }
  }

  throw lastError || new Error('All AI models failed');
}

/**
 * Verify if search results are genuinely related to the keyword.
 * Now evaluates both authenticity (confidence) and semantic relevance separately.
 */
async function verifyResults(keyword, results) {
  if (!results.length) return [];

  const systemPrompt = `你是一个专业的信息相关性分析AI。你的核心任务是严格判断每条搜索结果与给定关键词的**语义相关程度**。

你需要从两个维度独立评估：
1. **真实性 (confidence)**：内容是否真实可信，不是标题党、假新闻、旧闻重发、低质量噪音
2. **相关性 (relevance)**：内容与关键词的**语义关联强度**，而非仅看是否提到关键词

相关性评判标准（严格执行）：
- 1.0: 内容核心主题就是该关键词，深度讨论
- 0.8-0.9: 内容主要围绕该关键词展开，有实质性信息
- 0.6-0.7: 内容与关键词有明确关联，但不是核心主题
- 0.4-0.5: 内容只是顺带提及或间接相关
- 0.1-0.3: 内容与关键词几乎无关，只是碰巧出现相似词汇
- 0: 完全无关

需要过滤的内容类型：
- 标题党/诱导性标题（与实际内容不符）
- 假冒/虚假内容
- 只是随便提到关键词但主题完全不同的内容
- 过时的旧闻重发
- 低质量社媒噪音（随手回复、上下文不足、互动极低）

对每个结果返回 JSON 数组，每项包含：
- index: 原始索引
- is_genuine: 是否真实可信 (boolean)
- confidence: 真实性置信度 0-1
- relevance: 与关键词的语义相关度 0-1（这是最关键的指标）
- reason: 必须具体说明"该内容与关键词[X]的关系是什么、关联点在哪里"，不要泛泛描述内容本身`;

  const userPrompt = `关键词: "${keyword}"

搜索结果:
${results.map((r, i) => `[${i}] 标题: ${r.title}\n来源: ${r.source}\n来源引擎: ${r.sourceEngine || ''}\n站点: ${r.sourceDomain || ''}\n规则分: ${r.ruleScore || r.rule_score || 0}\n内容: ${(r.text || r.summary || '').substring(0, 300)}\nURL: ${r.url || ''}`).join('\n\n')}

请以JSON格式返回 {"results": [...]}
注意：reason 必须说明内容与关键词"${keyword}"之间的具体关联，而不只是描述内容本身。`;

  try {
    const resp = await callAI(systemPrompt, userPrompt);
    const verified = resp.results || [];
    return results.map((r, i) => {
      const v = verified.find(v => v.index === i);
      const relevance = v ? (v.relevance ?? v.confidence ?? 0) : 0;
      return {
        ...r,
        is_verified: v ? v.is_genuine : false,
        ai_confidence: v ? v.confidence : 0,
        ai_relevance: relevance,
        ai_reason: v ? v.reason : '未验证'
      };
    }).filter(r => r.is_verified && r.ai_confidence >= 0.6 && r.ai_relevance >= 0.7 && (r.ruleScore || r.rule_score || 0) >= 45);
  } catch (err) {
    console.error('AI verify error:', err.message);
    return filterReliableResults(results, { mode: 'keyword' }).slice(0, 12).map((result) => ({
      ...result,
      is_verified: true,
      ai_confidence: Math.max(0.55, (result.ruleScore || result.rule_score || 0) / 100),
      ai_relevance: Math.max(0.55, (result.ruleScore || result.rule_score || 0) / 100),
      ai_reason: 'AI 不可用，使用规则评分兜底保留',
    }));
  }
}

/**
 * Analyze and score hot topics from raw search results.
 * Now includes relevance scoring and reason per topic.
 */
async function analyzeHotTopics(domain, results) {
  if (!results.length) return [];

  const systemPrompt = `你是一个专业的热点分析AI。你的任务是从搜索结果中提炼出与指定领域**真正相关**的热点话题。

对每个热点话题，你需要：
1. 生成简洁有力的中文标题
2. 写一段50-100字的摘要
3. 评估热度分数(0-100)，考虑因素：话题新鲜度、影响范围、讨论热度
4. 评估与领域的相关度 relevance(0-100)：该话题与指定领域的匹配程度
5. 给出 reason：具体说明"为什么这是该领域的热点、关联点在哪里"
6. 合并重复/相似的话题

严格过滤：如果某个话题与指定领域只是表面相关或碰巧提及，relevance 应低于 50，不应入选。

返回JSON格式 {"topics": [{"title": "...", "summary": "...", "heat": 85, "relevance": 90, "reason": "...", "sources": [原始索引数组]}]}
限制最多返回10个热点，按综合分降序排列（综合分 = heat * 0.4 + relevance * 0.6）。`;

  const userPrompt = `领域: "${domain}"

原始搜索结果:
${results.map((r, i) => `[${i}] ${r.title}\n${(r.text || r.summary || '').substring(0, 300)}\n来源: ${r.source} | 引擎: ${r.sourceEngine || ''} | 站点: ${r.sourceDomain || ''} | 规则分: ${r.ruleScore || r.rule_score || 0} | ${r.url || ''}`).join('\n\n')}

请分析并提炼与领域"${domain}"**强相关**的热点话题，过滤掉弱相关内容：`;

  try {
    const resp = await callAI(systemPrompt, userPrompt);
    return (resp.topics || []).map(topic => {
      const heat = topic.heat ?? topic.score ?? 0;
      const relevance = topic.relevance ?? 80;
      const compositeScore = Math.round(heat * 0.4 + relevance * 0.6);
      return {
        ...topic,
        score: compositeScore,
        heat,
        relevance,
        reason: topic.reason || '',
        source_items: (topic.sources || []).map(i => results[i]).filter(Boolean)
      };
    }).filter(t => (t.relevance ?? 0) >= 50);
  } catch (err) {
    console.error('AI analyze error:', err.message);
    return filterReliableResults(results, { mode: 'hotspot' }).slice(0, 6).map((result, index) => ({
      title: result.title,
      summary: (result.text || result.summary || '').substring(0, 120),
      score: Math.max(result.ruleScore || result.rule_score || 0, 50 - index * 2),
      heat: Math.max(result.ruleScore || result.rule_score || 0, 50 - index * 2),
      relevance: 0,
      reason: 'AI 不可用，使用规则评分兜底保留',
      sources: [results.indexOf(result)].filter((value) => value >= 0),
      source_items: [result],
    }));
  }
}

module.exports = { callAI, verifyResults, analyzeHotTopics, expandQuery };
