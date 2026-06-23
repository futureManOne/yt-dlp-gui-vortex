## 1. 拆分组件模块

- [x] 1.1 创建 `web/src/components/Navigation.jsx` 并将侧边栏导航提取到该文件
- [x] 1.2 创建 `web/src/components/DownloadPanel.jsx` 并提取链接输入与解析、下载创建面板
- [x] 1.3 创建 `web/src/components/TasksPanel.jsx` 并提取下载列表、任务状态、控制台日志展示与相关动作
- [x] 1.4 创建 `web/src/components/DashboardPanel.jsx` 并提取磁盘空间、任务数量统计和热门网站导航
- [x] 1.5 创建 `web/src/components/CookiesPanel.jsx` 并提取 Cookies 导入及浏览器自动提取部分
- [x] 1.6 创建 `web/src/components/SettingsPanel.jsx` 并提取默认保存路径、格式与画质偏好，并添加“视觉主题”切换功能

## 2. 整合主入口 App.jsx

- [x] 2.1 引入所有已提取的子组件，并在 `App.jsx` 中声明 `theme` 状态（默认读取 `localStorage`）
- [x] 2.2 在最外层容器元素上应用 `theme-${theme}` 样式类，使全局主题能根据 state 变化动态重载
- [x] 2.3 简化 `App.jsx` 的渲染结构，传递对应的主状态和 callback 动作作为 props

## 3. 全局 CSS 主题定义与磨砂亮色设计

- [x] 3.1 在 `web/src/index.css` 末尾设计多主题样式定义（`.theme-cyber`、`.theme-ocean`、`.theme-sakura`、`.theme-light`）
- [x] 3.2 针对 `.theme-light` (Light Glassmorphism) 设计符合要求的磨砂玻璃背景、高对比度黑灰色字和亮蓝色核心按钮

## 4. 构建验证与发布

- [x] 4.1 在 `web` 目录下执行编译构建命令，确保打包成功
- [x] 4.2 运行主程序 `run_gui.py` 并检查主题切换与持久化的正常运作
