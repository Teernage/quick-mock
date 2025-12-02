# API Mock Tool

一个轻量级的 Chrome 扩展，用于在页面层拦截并模拟 `fetch` 与 `XMLHttpRequest` 的网络请求。支持 URL 匹配、方法过滤、开关启用/禁用与 JSON 响应返回，便于前后端联调与本地开发。

## 功能特性

- 拦截 `window.fetch` 与 `XMLHttpRequest` 请求并返回自定义 Mock 数据
- 支持 URL 匹配模式：`包含` 与 `完整匹配`
- 支持方法过滤：`ALL`、`GET`、`POST`、`PUT`、`DELETE`
- 规则开关：按条启用/禁用，实时生效
- JSON 文本自动解析，解析失败时原样作为字符串返回
- 超时保护：在 1000ms 未返回 Mock 时自动继续真实请求
- 纯前端，无需后端或本地服务

## 升级版：AI‑Mock（更强、更好用）

如果你需要更强的可视化与 AI 能力，推荐升级到 AI‑Mock：

- 项目地址：https://github.com/Teernage/AI-Mock
- 使用文档: https://juejin.cn/post/7578793960627486746
- 技术栈：Vue 3 + Vite + Element Plus
- 侧边栏交互：规则管理与编辑体验更流畅
- JSON 树形编辑：双击叶子即可编辑，支持格式化/校验/复制/清空与“放大”弹窗
- AI 生成（DeepSeek）：输入接口结构描述，SSE 流式生成 Mock JSON，自动滚动跟随输出
- 更好的提示与异常处理：Token 失效/额度不足等错误明确提示并引导操作
- 搜索与概览：支持按备注/URL 过滤；顶部卡片展示启用/禁用统计

## 目录结构

- `manifest.json` 扩展清单（MV3）
- `popup.html` / `popup.css` / `popup.js` 规则管理界面
- `content.js` 注入页面脚本与消息路由
- `injected.js` 页面内拦截与 Mock 实现
- `ceshi.html` 示例页面（本地演示用）

## 安装与加载（Chrome）

- 打开 `chrome://extensions/`
- 开启右上角的“开发者模式”
- 点击“加载已解压的扩展程序”，选择目录 `e:\chrome-mock\quick-mock`
- 加载后，扩展图标会出现在工具栏；点击图标打开 Mock 规则面板

## 使用说明

- 在弹窗中添加规则：
  - `URL 匹配规则`：选择 `包含` 或 `完整匹配`，输入 URL 或关键词
  - `请求方法`：选择 `ALL` 或具体方法
  - `Mock 数据 (JSON)`：输入 JSON 文本，例如 `{"code":0,"data":{"msg":"ok"}}`
- 管理规则：
  - “添加规则”写入存储并立即生效
  - “清空全部”删除所有规则
  - 列表中每条规则可切换“启用/禁用”或“删除”
  - 超过 100 字的 JSON 文本支持展开/收起
- 规则存储位置：`chrome.storage.local`，刷新页面后仍保留

## 规则匹配

- URL：根据选择的模式进行匹配
  - `完整匹配`：`requestUrl === pattern`
  - `包含`（默认）：`requestUrl.includes(pattern)`
- 方法：`rule.method === 'ALL'` 或 `rule.method === requestMethod`
- 只匹配启用中的规则：禁用状态不参与匹配

## 工作原理

- `content.js` 在 `document_start` 时注入 `injected.js`
- `injected.js`：
  - 覆写 `window.fetch` 和 `XMLHttpRequest` 的 `open/send`
  - 对每次请求发送页面内消息 `MOCK_REQUEST {url, method, id}`
  - `content.js` 收到后读取规则，若命中则回发 `MOCK_RESPONSE {shouldMock, mockData, status, headers}`
  - 若 `shouldMock` 为真：
    - `fetch` 返回 `Response(JSON.stringify(mockData), {status, headers})`
    - `XHR` 填充 `readyState=4`、`status`、`responseText/response` 并触发 `onreadystatechange/onload/onloadend`
  - 若 1000ms 内无响应或未命中规则，则发送真实网络请求

## 示例（本地演示）

- 打开 `ceshi.html`（双击或在 Chrome 输入 `file:///e:/chrome-mock/quick-mock/ceshi.html`）
- 页面会请求 `https://apis.tianapi.com/lunar/index?...`
- 在扩展弹窗添加规则：
  - 匹配模式：`包含`
  - URL：`apis.tianapi.com/lunar/index`
  - 方法：`GET`
  - Mock 数据：
    ```json
    { "code": 0, "msg": "mocked", "result": { "date": "2025-12-02" } }
    ```
- 返回区域将显示 Mock 的 JSON，而非真实接口结果

## 注意事项

- 部分站点有 CSP（内容安全策略）可能影响脚本注入；本扩展通过 `web_accessible_resources` 与 `document_start` 提前注入，通常可正常工作
- JSON 文本建议保持有效格式；解析失败时以字符串返回
- 如果规则不生效：
  - 检查匹配模式与方法选择是否正确
  - 在 DevTools Console 查看 `[Mock]` 日志与警告
  - 确认扩展已加载，且页面/标签未屏蔽扩展
- 本扩展仅在本地浏览器内运行，不会上报任何数据

## 开发与调试

- 修改后可在 `chrome://extensions/` 点击“刷新”扩展
- 关键文件：
  - 规则界面：`popup.html` / `popup.css` / `popup.js`
  - 注入与匹配：`content.js` / `injected.js`
- 日志前缀：`[Mock]`，便于筛选调试信息
