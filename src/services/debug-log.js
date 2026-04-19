function summarizeResult(item) {
  return {
    title: item.title || '',
    source: item.source || '',
    sourceEngine: item.sourceEngine || item.source_engine || '',
    sourceDomain: item.sourceDomain || item.source_domain || '',
    score: item.score ?? null,
    ruleScore: item.ruleScore ?? item.rule_score ?? null,
    aiConfidence: item.ai_confidence ?? null,
    url: item.url || item.source_url || '',
  };
}

function summarizeList(items, limit = 5) {
  return items.slice(0, limit).map(summarizeResult);
}

function logResultStage(stage, items, meta = {}) {
  const payload = {
    count: items.length,
    preview: summarizeList(items),
    ...meta,
  };

  console.log(`[Debug] ${stage}: ${JSON.stringify(payload, null, 2)}`);
}

function logSourceBreakdown(stage, groupedResults) {
  const summary = Object.entries(groupedResults).reduce((accumulator, [key, items]) => {
    accumulator[key] = {
      count: items.length,
      preview: summarizeList(items, 3),
    };
    return accumulator;
  }, {});

  console.log(`[Debug] ${stage}: ${JSON.stringify(summary, null, 2)}`);
}

module.exports = {
  logResultStage,
  logSourceBreakdown,
};