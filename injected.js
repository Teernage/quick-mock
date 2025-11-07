(function () {
  const originalFetch = window.fetch;
  const pendingRequests = new Map();
  let requestId = 0;

  window.addEventListener('message', (event) => {
    if (event.data.type !== 'MOCK_RESPONSE') return;

    const { id, shouldMock, mockData, status, headers } = event.data;
    const resolve = pendingRequests.get(id);

    if (resolve) {
      resolve({ shouldMock, mockData, status, headers });
      pendingRequests.delete(id);
    }
  });

  function normalizeUrl(input) {
    try {
      if (typeof input === 'string') return input;
      if (input && typeof input === 'object' && 'url' in input) {
        return input.url;
      }
    } catch (_) { }
    return String(input);
  }

  // 提取请求方法
  function getMethod(url, options) {
    // 如果 url 是 Request 对象，直接从对象中获取 method
    if (url && typeof url === 'object' && 'method' in url) {
      return url.method.toUpperCase();
    }
    // 否则从 options 中获取
    return (options?.method || 'GET').toUpperCase();
  }

  function sendMockRequest(url, method) {
    return new Promise((resolve) => {
      const id = requestId++;
      pendingRequests.set(id, resolve);

      const safeUrl = normalizeUrl(url);

      try {
        window.postMessage(
          {
            type: 'MOCK_REQUEST',
            url: safeUrl,
            method,
            id,
          },
          '*'
        );
      } catch (e) {
        if (pendingRequests.has(id)) {
          resolve({ shouldMock: false });
          pendingRequests.delete(id);
        }
        return;
      }

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          resolve({ shouldMock: false });
          pendingRequests.delete(id);
        }
      }, 100);
    });
  }

  window.fetch = async function (url, options = {}) {
    const method = getMethod(url, options); // 使用获取方法
    const response = await sendMockRequest(url, method);

    if (response.shouldMock) {
      const safeUrl = normalizeUrl(url);
      console.log('[Mock] 拦截请求:', method, safeUrl, response.mockData);
      return new Response(JSON.stringify(response.mockData), {
        status: response.status,
        headers: response.headers,
      });
    }

    return originalFetch.call(this, url, options);
  };
})();
