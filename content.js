const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);

async function getMockRulesSafely() {
  try {
    if (!chrome?.runtime?.id || !chrome?.storage?.local) return [];
    const result = await chrome.storage.local.get('mockRules');
    if (chrome.runtime.lastError) {
      console.warn('[Mock] 读取存储失败:', chrome.runtime.lastError);
      return [];
    }
    const rules = result.mockRules || [];
    return Array.isArray(rules) ? rules : [];
  } catch (err) {
    console.warn('[Mock] 读取存储异常:', err);
    return [];
  }
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const data = event?.data;
  if (!data || data.type !== 'MOCK_REQUEST') return;

  const { url, method, id } = data;

  const rules = await getMockRulesSafely();

  for (let rule of rules) {
    try {
      const pattern = new RegExp(rule.url);
      const methodMatch = !rule.method || rule.method === 'ALL' || rule.method === method;

      if (pattern.test(url) && methodMatch) {
        window.postMessage(
          {
            type: 'MOCK_RESPONSE',
            id,
            shouldMock: true,
            mockData: JSON.parse(rule.data),
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
          '*'
        );
        return;
      }
    } catch (e) {
      console.warn('[Mock] 规则处理失败:', e);
    }
  }

  window.postMessage({ type: 'MOCK_RESPONSE', id, shouldMock: false }, '*');
});
