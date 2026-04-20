const { verifyResults } = require('./ai');

/**
 * Built-in test cases for evaluating AI relevance accuracy.
 * Each case has: keyword, a mock result, and the expected judgment.
 */
const TEST_CASES = [
  // ===== 明确相关 =====
  {
    keyword: 'ChatGPT',
    result: {
      title: 'OpenAI 发布 ChatGPT 重大更新，支持多模态输入',
      text: 'OpenAI 今日宣布 ChatGPT 新版本支持图片和语音输入，用户可以直接上传图片进行分析。这是 ChatGPT 发布以来最大的功能升级之一。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'techcrunch.com', url: 'https://techcrunch.com/chatgpt-update', ruleScore: 72,
    },
    expected: { is_genuine: true, min_relevance: 0.8 },
    label: '核心主题完全匹配',
  },
  {
    keyword: 'AI编程',
    result: {
      title: 'GitHub Copilot 使用体验：AI 编程助手真的能提高效率吗？',
      text: '本文深度测试了 GitHub Copilot 在日常编程中的实际表现，包括代码补全准确率、复杂逻辑处理能力等。AI 编程工具正在改变开发者的工作方式。',
      source: 'web', sourceEngine: 'duckduckgo', sourceDomain: 'sspai.com', url: 'https://sspai.com/copilot-review', ruleScore: 68,
    },
    expected: { is_genuine: true, min_relevance: 0.8 },
    label: '语义强相关（AI编程助手）',
  },

  // ===== 弱相关 / 间接相关 =====
  {
    keyword: 'ChatGPT',
    result: {
      title: '2024年最佳笔记软件推荐：Notion、Obsidian、Logseq 对比',
      text: '在笔记软件对比中，我们发现 Notion 集成了 ChatGPT 功能，但本文主要讨论的是笔记软件的核心功能、同步能力和插件生态。',
      source: 'web', sourceEngine: 'bing', sourceDomain: '36kr.com', url: 'https://36kr.com/note-apps', ruleScore: 55,
    },
    expected: { is_genuine: true, max_relevance: 0.5 },
    label: '弱相关（只是顺带提及ChatGPT）',
  },
  {
    keyword: '鱼皮的AI导航',
    result: {
      title: '2024年最好用的AI工具大全',
      text: '本文汇总了2024年最好用的AI工具，涵盖文本生成、图片生成、代码辅助等多个类别。这些工具正在改变人们的工作方式。',
      source: 'web', sourceEngine: 'duckduckgo', sourceDomain: 'example.com', url: 'https://example.com/ai-tools', ruleScore: 50,
    },
    expected: { is_genuine: true, max_relevance: 0.4 },
    label: '弱相关（AI工具合集但未提及鱼皮）',
  },

  // ===== 完全不相关 =====
  {
    keyword: 'ChatGPT',
    result: {
      title: '今日菜谱：红烧肉的做法详解',
      text: '红烧肉是一道经典的中国家常菜，选用五花肉，加入酱油、糖、八角等调料，小火慢炖两小时即可。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'meishichina.com', url: 'https://meishichina.com/recipe', ruleScore: 30,
    },
    expected: { is_genuine: false, max_relevance: 0.1 },
    label: '完全不相关',
  },
  {
    keyword: 'AI编程',
    result: {
      title: '篮球比赛精彩集锦：NBA季后赛回顾',
      text: 'NBA季后赛进入白热化阶段，各支球队展开了激烈的角逐。本文回顾了本赛季最精彩的几场比赛。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'sports.com', url: 'https://sports.com/nba', ruleScore: 25,
    },
    expected: { is_genuine: false, max_relevance: 0.1 },
    label: '完全不相关',
  },

  // ===== 标题党 =====
  {
    keyword: 'ChatGPT',
    result: {
      title: '震惊！ChatGPT 即将取代所有程序员！',
      text: '点击查看更多精彩内容...本站为您提供最新最全的科技资讯。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'baijiahao.baidu.com', url: 'https://baijiahao.baidu.com/xxx', ruleScore: 20,
    },
    expected: { is_genuine: false, max_relevance: 0.3 },
    label: '标题党（内容空洞）',
  },

  // ===== 旧闻重发 =====
  {
    keyword: 'ChatGPT',
    result: {
      title: 'ChatGPT 正式发布（2022年11月）',
      text: '2022年11月30日，OpenAI 正式发布了 ChatGPT，这是一款基于 GPT-3.5 的对话式 AI。发布后迅速走红，两个月内用户破亿。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'news.com', url: 'https://news.com/chatgpt-launch', ruleScore: 40,
    },
    expected: { is_genuine: false, max_relevance: 0.5 },
    label: '旧闻重发',
  },

  // ===== 低质量社媒噪音 =====
  {
    keyword: 'AI编程',
    result: {
      title: '@someone',
      text: 'chatgpt好用吗',
      source: 'twitter', sourceEngine: 'twitter', sourceDomain: 'x.com', url: 'https://x.com/status/123', ruleScore: 15,
    },
    expected: { is_genuine: false, max_relevance: 0.3 },
    label: '低质量短帖',
  },

  // ===== 查询扩展场景：变体表述 =====
  {
    keyword: '程序员鱼皮',
    result: {
      title: '鱼皮分享AI导航站建设经验',
      text: '知名程序员博主鱼皮近日分享了他的AI导航网站的搭建过程，包括数据来源、分类方式和用户体验设计。',
      source: 'web', sourceEngine: 'bing', sourceDomain: 'bilibili.com', url: 'https://bilibili.com/video/xxx', ruleScore: 60,
    },
    expected: { is_genuine: true, min_relevance: 0.8 },
    label: '变体表述仍强相关',
  },
];

/**
 * Run evaluation: call verifyResults on each test case, compare with expected.
 * Returns detailed report.
 */
async function runRelevanceEval() {
  const report = {
    total: TEST_CASES.length,
    passed: 0,
    failed: 0,
    errors: 0,
    details: [],
    accuracy: 0,
    falsePositives: 0,
    falseNegatives: 0,
  };

  for (const tc of TEST_CASES) {
    const mockResult = { ...tc.result };
    try {
      // Call verifyResults with a single result
      const results = await verifyResults(tc.keyword, [{ ...mockResult, ruleScore: mockResult.ruleScore || 50 }]);

      const passed = results.length > 0;
      const item = results[0] || {};
      const relevance = item.ai_relevance ?? 0;
      const confidence = item.ai_confidence ?? 0;

      let verdict = 'pass';
      let reason = '';

      if (tc.expected.is_genuine) {
        // Expected to pass filter
        if (!passed) {
          verdict = 'fail';
          reason = '应该通过但被过滤了';
          report.falseNegatives++;
        } else if (tc.expected.min_relevance && relevance < tc.expected.min_relevance) {
          verdict = 'fail';
          reason = `相关度 ${relevance.toFixed(2)} 低于预期最小值 ${tc.expected.min_relevance}`;
        } else if (tc.expected.max_relevance && relevance > tc.expected.max_relevance) {
          verdict = 'warn';
          reason = `相关度 ${relevance.toFixed(2)} 高于预期上限 ${tc.expected.max_relevance}（可能过于宽松）`;
        }
      } else {
        // Expected to be filtered out
        if (passed) {
          verdict = 'fail';
          reason = `应该被过滤但通过了 (relevance=${relevance.toFixed(2)}, confidence=${confidence.toFixed(2)})`;
          report.falsePositives++;
        }
      }

      if (verdict === 'pass') report.passed++;
      else if (verdict === 'fail') report.failed++;

      report.details.push({
        label: tc.label,
        keyword: tc.keyword,
        title: tc.result.title.substring(0, 60),
        verdict,
        reason: reason || (verdict === 'pass' ? '符合预期' : ''),
        actual: {
          passed,
          relevance: Number(relevance.toFixed(2)),
          confidence: Number(confidence.toFixed(2)),
          ai_reason: item.ai_reason || '(被过滤/未返回)',
        },
      });
    } catch (err) {
      report.errors++;
      report.details.push({
        label: tc.label,
        keyword: tc.keyword,
        title: tc.result.title.substring(0, 60),
        verdict: 'error',
        reason: err.message,
        actual: null,
      });
    }
  }

  report.accuracy = report.total > 0
    ? Number(((report.passed / report.total) * 100).toFixed(1))
    : 0;

  console.log(`[Eval] Relevance evaluation: ${report.passed}/${report.total} passed (${report.accuracy}%), ${report.falsePositives} false positives, ${report.falseNegatives} false negatives`);

  return report;
}

module.exports = { runRelevanceEval, TEST_CASES };
