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
    enabled: rule.enabled !== false, //  默认启用
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
    //  添加 enabled: true
    rules.push({ url, method, matchMode, data, enabled: true });
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

//  添加开关规则函数
window.toggleRule = (index) => {
  rules[index].enabled = !rules[index].enabled;
  chrome.storage.local.set({ mockRules: rules });
  renderRules();
  const status = rules[index].enabled ? '已启用' : '已禁用';
  showToast(`✓ ${status}`);
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
    exact: '完整',
  };

  container.innerHTML = rules
    .map(
      (rule, i) => `
    <div class="rule-item ${rule.enabled === false ? 'disabled' : ''}">
      <div class="rule-header">
        <div class="rule-url">
          <span class="method-badge method-${(rule.method || 'ALL').toLowerCase()}">${rule.method || 'ALL'}</span>
          <span class="match-mode-badge match-mode-${rule.matchMode || 'contains'}">${matchModeText[rule.matchMode] || '包含'}</span>
          <span>${escapeHtml(rule.url)}</span>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <div class="rule-toggle-wrapper">
            <input 
              type="checkbox" 
              class="rule-toggle-checkbox" 
              id="toggle-${i}" 
              data-index="${i}"
              ${rule.enabled !== false ? 'checked' : ''}
            >
            <label for="toggle-${i}" class="toggleSwitch"></label>
          </div>
          <button class="btn-delete" data-index="${i}">删除</button>
        </div>
      </div>
      <div class="rule-data-wrapper">
        <div class="rule-data" data-index="${i}">${escapeHtml(rule.data)}</div>
        ${rule.data.length > 100 ? `
          <button class="btn-toggle-data" data-index="${i}">
            <span class="toggle-text">展开</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `
    )
    .join('');

  // 开关按钮事件（替换原来的 .btn-toggle 事件）
  container.querySelectorAll('.rule-toggle-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const index = Number(e.target.getAttribute('data-index'));
      if (!Number.isNaN(index)) {
        window.toggleRule(index);
      }
    });
  });

  // 删除按钮事件
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-index'));
      if (!Number.isNaN(index)) {
        rules.splice(index, 1);
        chrome.storage.local.set({ mockRules: rules });
        renderRules();
        showToast('✓ 已删除');
      }
    });
  });

  // 折叠展开按钮事件
  container.querySelectorAll('.btn-toggle-data').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-index'));
      const dataElement = container.querySelector(`.rule-data[data-index="${index}"]`);
      const isExpanded = dataElement.classList.contains('expanded');

      dataElement.classList.toggle('expanded');
      btn.classList.toggle('expanded');
      btn.querySelector('.toggle-text').textContent = isExpanded ? '展开' : '收起';
    });
  });
}



function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}
