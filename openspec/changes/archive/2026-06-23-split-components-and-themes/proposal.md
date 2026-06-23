## Why

把庞大的 `App.jsx` 单一文件拆分为模块化的组件，提高代码的可维护性与复用性。同时，设计并提供多套全局主题样式（如 Cyber Black、Midnight Ocean、Sakura Glow、Light Glassmorphism 等），允许用户在设置中自由切换，提升个性化视觉体验。

## What Changes

- **组件模块化重构**：将 `App.jsx` 重构，提取核心模块到 `web/src/components/` 目录下：
  - `Navigation.jsx`：侧边栏导航组件。
  - `DownloadPanel.jsx`：包含视频链接输入、解析及单视频下载逻辑。
  - `TasksPanel.jsx`：下载任务列表，包含任务卡片及日志控制台。
  - `DashboardPanel.jsx`：存储空间容量条、任务统计与热门网站指南。
  - `CookiesPanel.jsx`：凭证拖拽/选择导入以及浏览器提取凭证的设置。
  - `SettingsPanel.jsx`：通用下载路径、封装格式、默认画质设置，并新增主题切换入口。
- **全局多主题系统**：
  - 在设置面板中引入主题切换下拉选择框（提供 Cyber Black 赛博黑、Midnight Ocean 深海蓝、Sakura Glow 樱花粉、Light Glassmorphism 极简白等主题）。
  - 使用 Vanilla CSS 变量在 `index.css` 中定义主题属性。
  - 将选中的主题保存至 `localStorage`，实现跨刷新/重构的持久化生效。
  - 实现极简白（Light Glassmorphism）的主题效果，设计毛玻璃磨砂效果、高对比可读字色和精致亮蓝色按钮/进度条。

## Capabilities

### New Capabilities
- `theme-management`: 用户可在设置面板中选择并应用不同的全局视觉主题样式（包括 Cyber Black、Midnight Ocean、Sakura Glow、Light Glassmorphism），并且所选的主题会在本地持久化保存。

### Modified Capabilities
无

## Impact

- **Affected code**:
  - `web/src/App.jsx` (主应用入口逻辑重构，分发 props 与状态)
  - `web/src/index.css` (新增多主题 CSS 变量定义、全局样式适配)
  - 新增 `web/src/components/Navigation.jsx`
  - 新增 `web/src/components/DownloadPanel.jsx`
  - 新增 `web/src/components/TasksPanel.jsx`
  - 新增 `web/src/components/DashboardPanel.jsx`
  - 新增 `web/src/components/CookiesPanel.jsx`
  - 新增 `web/src/components/SettingsPanel.jsx`
- **Dependencies**: 无新增外部依赖。
