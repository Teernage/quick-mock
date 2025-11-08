/**
 * 在页面中注入扩展的 injected.js 脚本。
 * 使用 chrome.runtime.getURL 获取扩展内资源的绝对 URL。
 */
function init() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
}

init();

/**
 * 安全读取本地存储中的 mock 规则。
 * 若扩展未加载或 API 不可用、或读取失败，返回空数组。
 * @returns {Array}  - mock 规则数组。
 */
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

/**
 * 根据匹配模式对 URL 进行匹配。
 * @param {*} url  - 请求的 URL。
 * @param {*} pattern  - 匹配规则。
 * @param {*} mode  - 匹配模式
 * @returns {boolean}  - 匹配结果。
 */
function matchUrl(url, pattern, mode) {
  try {
    switch (mode) {
      case 'exact':
        return url === pattern;
      case 'contains':
      default:
        return url.includes(pattern);
    }
  } catch (e) {
    console.warn('[Mock] URL 匹配失败:', e);
    return false;
  }
}

/**
 * 监听来自 content-script 的消息。
 * 若消息类型为 MOCK_REQUEST，根据 mock 规则匹配并返回模拟数据。
 */
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const data = event?.data;
  if (!data || data.type !== 'MOCK_REQUEST') return;

  const { url, method, id } = data;

  // 读取 mock 规则
  const rules = await getMockRulesSafely();

  for (let rule of rules) {
    try {
      const matchMode = rule.matchMode || 'contains';
      const urlMatch = matchUrl(url, rule.url, matchMode);
      const methodMatch =
        !rule.method || rule.method === 'ALL' || rule.method === method;

      if (urlMatch && methodMatch) {
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
