<!-- MANPAGE: BEGIN EXCLUDED SECTION -->
<div align="center">

# 🌪️ Vortex Downloader (yt-dlp-gui)

### **A Premium, High-Performance React + Python Desktop GUI for yt-dlp**
### **基于 React + Python (PyWebView) 的高颜值、高性能 yt-dlp 桌面客户端**

[Features](#features) • [Quick Start](#quick-start--快速开始) • [Development](#development--开发指南) • [Attribution](#attribution--致谢) • [CLI Options](#cli-options-documentation)

[![Vite](https://img.shields.io/badge/Vite-v8.0.16-bf55ec.svg?style=for-the-badge&logo=vite)](https://vite.dev)
[![React](https://img.shields.io/badge/React-v18-blue.svg?style=for-the-badge&logo=react)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-v3.8+-3776AB.svg?style=for-the-badge&logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg?style=for-the-badge)](LICENSE)

</div>

---

## English Version

### About
**Vortex Downloader** is a beautiful, modern desktop client wrapper for **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**. The application is built using a hybrid architecture:
- **Frontend**: A high-performance **React + Vite** single page application styled with a premium **Space Dark & Neon Glassmorphism** aesthetic.
- **Backend**: A multithreaded **Python** API server integrated into a native desktop wrapper using **PyWebView (WebView2/Edge)**.

### Features
*   🌪️ **Proximity URL Controls**: Paste video URLs and initiate downloads with a single click.
*   🔮 **Neon Glassmorphic Design**: An immersive space-dark interface with glow orbs, sleek translucent panels, and smooth hover micro-animations.
*   ⚡ **Interactive Task Monitoring**: Track active downloads with progress bars, speeds, and ETA meters inside individual floating cards.
*   📜 **Collapsible Terminal Consoles**: Review real-time console log strings directly inside the task card.
*   🍪 **Cookies Management**: Import standard netscape cookies via a drag-and-drop file dropzone or select automated extraction from major browsers (Chrome, Edge, Firefox, Brave, Safari, etc.) to bypass download restrictions.
*   ⚙️ **Custom Configuration**: Select video qualities (4K, 1080p, 720p), preferred formats, and change default download directories.
*   🚀 **Zero-Config Execution**: The production-ready compiled React app bundle is pre-built and tracked, allowing users to run the client directly using Python without installing Node.js.

### Quick Start
Make sure you have python installed (Python 3.8+ is recommended).
1. Clone the repository:
   ```bash
   git clone https://github.com/futureManOne/yt-dlp-gui-vortex.git
   cd yt-dlp-gui-vortex
   ```
2. Create and activate a virtual environment, then install dependencies:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate      # On Windows
   source .venv/bin/activate   # On Linux/macOS
   pip install -r requirements.txt
   pip install pywebview
   ```
3. Launch the desktop GUI:
   ```bash
   python run_gui.py
   ```

### Development
If you want to modify the React frontend:
1. Start the Python backend API server:
   ```bash
   python web_server.py
   ```
2. In a separate terminal, navigate to the `web` folder, install npm packages, and run the Vite dev server:
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser. When you are done editing, compile the bundle so it is available to the desktop app:
   ```bash
   npm run build
   ```

### Attribution
We would like to thank the authors and maintainers of **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**. This project uses the open-source `yt-dlp` core engine to perform media downloading, parsing, and extraction. 
The original repository can be found here: [GitHub - yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp).

---

## 中文文档

### 项目简介
**Vortex Downloader** 是一款为 **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** 打造的极具未来科技感的高颜值桌面下载器客户端。项目采用前后端分离的混合架构：
- **前端**：采用 **React + Vite** 框架构建，使用 **深空暗黑与霓虹毛玻璃 (Space Dark & Neon Glassmorphism)** 视觉体系，支持流畅的微交互与响应式适配。
- **后端**：使用多线程 **Python** 搭建本地 API 接口，并使用 **PyWebView (WebView2/Edge)** 打包为标准的 Windows/OS 桌面单窗口应用。

### 核心特性
*   🌪️ **极致交互体验**：将链接输入框与渐变下载按钮临近布局，输入链接后可顺手一键高速下载。
*   🔮 **赛博暗黑美学**：科幻的暗黑色彩基调、霓虹呼吸渐变灯效、优雅的半透明毛玻璃材质面板，以及流畅的悬停微动画。
*   ⚡ **任务进度监控**：独立卡片式监视器，实时展示当前下载文件的文件名、清晰度、进度条、百分比、即时网速与剩余时间。
*   📜 **集成控制台日志**：每张任务卡片均内置可折叠的终端日志窗口，随时追踪底层解析器的详细调试信息。
*   🍪 **Cookie 绕过限制**：支持将 Netscape 文本格式的 cookies.txt 直接拖拽或点击上传，亦可直接选择从主流浏览器（Chrome、Edge、Firefox、Brave、Safari等）免导出自动读取 Cookie。
*   ⚙️ **自由配置参数**：可自由调整最高下载画质（4K、1080p、720p）、封装格式选项，以及自定义绝对路径文件保存目录。
*   🚀 **开箱即用，免配 Node.js**：生产环境所需的 React 打包产物已预先编译并托管于 `web/dist` 下，普通用户克隆项目后**只需有 Python 环境**即可双击直接打开使用，无需另行打包。

### 快速开始
请确保您的计算机上已安装 Python（推荐 3.8+ 版本）。
1. 克隆本仓库到本地：
   ```bash
   git clone https://github.com/futureManOne/yt-dlp-gui-vortex.git
   cd yt-dlp-gui-vortex
   ```
2. 创建并激活虚拟环境，并安装依赖项：
   ```bash
   python -m venv .venv
   .venv\Scripts\activate      # Windows 系统
   source .venv/bin/activate   # Linux/macOS 系统
   pip install -r requirements.txt
   pip install pywebview
   ```
3. 启动 GUI 桌面应用：
   ```bash
   python run_gui.py
   ```

### 开发者指南
如果您需要二次开发或修改 React 前端界面：
1. 启动 Python 后台 API 服务：
   ```bash
   python web_server.py
   ```
2. 打开新的终端，进入 `web` 文件夹，安装前端依赖并启动 Vite 热更新开发服务器：
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. 在浏览器中访问 `http://localhost:3000` 进行开发调试。修改完成后，务必编译打包以生成最新版桌面静态资源：
   ```bash
   npm run build
   ```

### 致谢
本项目的底层视频流解析、解密和下载核心能力全部基于强大的开源项目 **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**。感谢 `yt-dlp` 的所有维护者和贡献者提供了如此卓越的核心下载引擎！
官方项目链接：[GitHub - yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)
