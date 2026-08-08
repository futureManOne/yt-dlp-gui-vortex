## Context

当前前端 `web/src/App.jsx` 是一个包含了所有 UI 板块、逻辑处理、网络请求和 UI 状态的庞大单体文件（约 1250 行）。这种结构导致：
1. 代码难以阅读、调试和扩展。
2. 样式只支持单一赛博朋克深色风格，没有全局的多主题体系和亮色模式，不便于满足不同用户的个性化视觉偏好。

为了解决此问题，需要将 `App.jsx` 进行组件拆分（分板块、分模块），并将多套全局样式风格入口集成在设置中。

## Goals / Non-Goals

**Goals:**
- 将 `App.jsx` 的庞大结构拆分为高可读性的子组件，存放在 `web/src/components/` 目录下。
- 设计四套全局样式主题：赛博黑 (Cyber Black - 默认)、深海蓝 (Midnight Ocean)、樱花粉 (Sakura Glow)、极简亮色玻璃 (Light Glassmorphism)。
- 在“设置”选项卡下提供全局主题下拉选择器。
- 主题状态持久化到 `localStorage`，确保刷新页面或重启客户端后选择的主题依然生效。

**Non-Goals:**
- 并不重构后端的 Python 接口或下载核心逻辑。
- 暂不使用 TailwindCSS，继续使用 Vanilla CSS 变量在 `index.css` 中重载各主题的色彩记号。

## Decisions

### 1. 状态提升 (State Lifting) 与 Props 传递
- **决策**：所有的核心状态（如视频解析结果、下载任务列表、当前设置项、Cookie 状态）以及核心 API 方法（如 `handleParseVideo`、`handleStartDownload` 等）继续保留在顶层组件 `App.jsx` 中，作为唯一数据源。
- **原因**：这使得组件只需接收 props，无须在各子组件间建立复杂的全局状态管理机制（如 Redux 或 Context），保持代码轻量。

### 2. 组件划分与文件组织
- 在 `web/src/components` 目录下创建以下组件：
  - `Navigation.jsx`：处理侧边栏 Tab 切换及 Vortex 图标展示。
  - `DownloadPanel.jsx`：中间区域，处理 URL 输入、解析反馈展示、单视频/批量视频触发下载。
  - `TasksPanel.jsx`：右侧任务区，处理任务卡片渲染、日志折叠栏展开、复制日志、取消下载和隐藏卡片等逻辑。
  - `DashboardPanel.jsx`：右侧辅助区，渲染可用磁盘空间、任务数量统计和支持的网站导流网格。
  - `CookiesPanel.jsx`：处理拖拽上传 txt Cookie、清理 Cookie，以及选择浏览器自动提取。
  - `SettingsPanel.jsx`：处理目录选择（手动或弹窗）、音视频封装格式选择、画质偏好，并新增主题切换选项。

### 3. 主题系统实现 (Vanilla CSS Variables & LocalStorage)
- **决策**：通过为最外层包裹的 `.app-container` 赋予不同的 class（如 `theme-cyber`、`theme-ocean`、`theme-sakura`、`theme-light`），并在 `index.css` 的末尾用这些 class 重写 `:root` 中定义的色彩变量。
- **亮色玻璃模式细节**：
  - `--bg-dark`: `#F0F2F6` (高档灰白色底色)
  - `--bg-card`: `rgba(255, 255, 255, 0.7)` (高透明白色磨砂玻璃)
  - `--text-main`: `#1F2937` (高对比深灰字色)
  - `--text-sec`: `#4B5563`
  - `--text-mute`: `#9CA3AF`
  - `--border-color`: `rgba(0, 0, 0, 0.08)`
  - `--border-hover`: `rgba(0, 122, 255, 0.4)`
  - `--primary-grad`: `linear-gradient(135deg, #007AFF 0%, #5856D6 100%)` (精致蓝紫色渐变)
  - `--primary-glow`: `0 8px 24px rgba(0, 122, 255, 0.15)`

## Risks / Trade-offs

- **[Risk] 组件过多导致 props 传递层级较深**
  - *Mitigation*: 所有的子组件都是 `App.jsx` 的直接子节点，不存在多层嵌套（Prop Drilling），因此单层 props 传递即可，结构依然清晰。
- **[Risk] 亮色模式下部分图标或特殊文字看不清**
  - *Mitigation*: 严格测试 CSS 变量中 `--text-main` 和 `--text-sec` 的色彩对比度，并为亮色主题设计清晰的反色边框。
