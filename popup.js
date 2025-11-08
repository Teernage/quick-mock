let rules = [];

const openTabBtn = document.getElementById('openTab');

// 在新标签页中打开
openTabBtn.addEventListener('click', function () {
  window.open(window.location.href);
});

// 恢复输入框内容
chrome.storage.local.get(['mockRules', 'draftInput'], (result) => {
  rules = result.mockRules || [];
  rules = rules.map((rule) => ({
    ...rule,
    matchMode: rule.matchMode || 'contains',
  }));
  renderRules();

  // 恢复草稿
  const draft = result.draftInput || {};
  if (draft.url) document.getElementById('url').value = draft.url;
  if (draft.method) document.getElementById('method').value = draft.method;
  if (draft.matchMode)
    document.getElementById('matchMode').value = draft.matchMode;
  if (draft.data) document.getElementById('data').value = draft.data;
});

// 监听输入框变化，自动保存草稿
function saveDraft() {
  const draft = {
    url: document.getElementById('url').value.trim(),
    method: document.getElementById('method').value,
    matchMode: document.getElementById('matchMode').value,
    data: document.getElementById('data').value.trim(),
  };
  chrome.storage.local.set({ draftInput: draft });
}

document.getElementById('url').addEventListener('input', saveDraft);
document.getElementById('method').addEventListener('change', saveDraft);
document.getElementById('matchMode').addEventListener('change', saveDraft);
document.getElementById('data').addEventListener('input', saveDraft);

document.getElementById('add').onclick = () => {
  const url = document.getElementById('url').value.trim();
  const method = document.getElementById('method').value;
  const matchMode = document.getElementById('matchMode').value;
  const data = document.getElementById('data').value.trim();

  if (!url || !data) {
    showToast('请填写完整信息');
    return;
  }

  try {
    JSON.parse(data);
    rules.push({ url, method, matchMode, data });
    chrome.storage.local.set({ mockRules: rules });

    // 清空输入框和存储
    document.getElementById('url').value = '';
    document.getElementById('data').value = '';
    document.getElementById('method').value = 'ALL';
    document.getElementById('matchMode').value = 'contains';
    chrome.storage.local.remove('draftInput');

    renderRules();
    showToast('✓ 添加成功');
  } catch (e) {
    showToast('JSON 格式错误');
  }
};

document.getElementById('clear').onclick = () => {
  if (rules.length === 0) return;
  if (confirm('确定清空所有规则？')) {
    rules = [];
    chrome.storage.local.set({ mockRules: [] });
    renderRules();
    showToast('✓ 已清空');
  }
};

function renderRules() {
  const container = document.getElementById('rules');
  const count = document.getElementById('count');
  count.textContent = `${rules.length} 条`;

  if (rules.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6M9 15h6"/>
        </svg>
        <p>暂无 Mock 规则</p>
      </div>
    `;
    return;
  }

  const matchModeText = {
    contains: '包含',
    exact: '精确',
  };

  container.innerHTML = rules
    .map(
      (rule, i) => `
    <div class="rule-item">
      <div class="rule-header">
        <div class="rule-url">
          <span class="method-badge method-${(
            rule.method || 'ALL'
          ).toLowerCase()}">${rule.method || 'ALL'}</span>
          <span class="match-mode-badge match-mode-${
            rule.matchMode || 'contains'
          }">${matchModeText[rule.matchMode] || '包含'}</span>
          <span>${escapeHtml(rule.url)}</span>
        </div>
        <button class="btn-delete" data-index="${i}">删除</button>
      </div>
      <div class="rule-data">${escapeHtml(rule.data)}</div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-index'));
      if (!Number.isNaN(index)) {
        window.deleteRule(index);
      }
    });
  });
}

window.deleteRule = (index) => {
  rules.splice(index, 1);
  chrome.storage.local.set({ mockRules: rules });
  renderRules();
  showToast('✓ 已删除');
};

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: white;
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 12px;
    z-index: 1000;
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
