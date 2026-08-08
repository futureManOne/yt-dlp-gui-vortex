## Context

系统目前只提供单 Cookie 导入及硬编码的中文界面。
本设计的目标是在后端实现对多 Cookie 文件的物理隔离存储、增删操作，并在调用 yt-dlp 下载及解析时自动对其内容进行合并输出；同时在前端构建基于 React Context 的无第三方依赖 i18n 多语言框架，并将整个界面文本重构为中英文双语语言包。

## Goals / Non-Goals

**Goals:**
- **多凭证后台实现**:
  - 创建 `cookies` 子目录，支持同时存放多份凭证文本。
  - 在 `vortex_config.json` 中使用 `cookie_files` 列表记录所有的凭证元信息（包括 id, name, size, date）。
  - 实现 `/api/cookie` (新增)、`/api/cookie/delete` (删除单个)、`/api/config` (获取列表及合并后的 cookie 数据) 接口。
  - 在解析和下载逻辑中读取所有已存凭证内容并进行合并后作为单个临时 cookies.txt 文件传给 yt-dlp。
- **多凭证前端实现**:
  - 重构 `CookiesPanel.jsx` 以表格/列表形式展示已导入的凭证列表（展示名称、大小、导入时间、删除按钮）。
  - 支持多次拖拽/选择文件进行增量上传。
- **国际化中英文切换**:
  - 创建 `web/src/translations.js` 存放中英文对照字典。
  - 创建 `web/src/i18n.jsx` 提供 `LanguageProvider` 与 `useTranslation` React 钩子。
  - 重构所有子组件（`Navigation`, `DownloadPanel`, `TasksPanel`, `DashboardPanel`, `CookiesPanel`, `SettingsPanel`）使其调用 `t('key')` 获取对应语言文本。
  - 在 `SettingsPanel` 增加语言选择项（切换时自动更新语言状态并持久化至 `localStorage`）。

**Non-Goals:**
- 不支持按下载任务单独指定特定凭证文件，所有上传的凭证默认全部生效（通过合并）。

## Decisions

### 1. 多凭证存储及合并机制

- **物理存储位置**:
  `get_config_dir()/cookies/cookie_<id>.txt`
- **配置文件元数据结构 (`vortex_config.json`)**:
  ```json
  {
      "cookie_files": [
          {
              "id": "1782195000",
              "name": "bilibili_cookies.txt",
              "size": 1250,
              "date": "2026-06-23 14:30"
          }
      ]
  }
  ```
- **凭证合并逻辑**:
  yt-dlp 的 `--cookiefile` 期望传入单个文件路径。由于 Netscape cookies 文件是基于文本行的一般格式（每行代表一条 cookie 规则，字段以 Tab 分隔，`#` 开头为注释），在发起任务前，我们将所有 `cookies/*.txt` 文件的内容读取、过滤空白行后，使用换行符拼接写入到 `temp/cookies_<task_id>.txt` 临时文件中作为参数传入。

### 2. 轻量级 React 国际化 (i18n)

- **避免引入第三方库 (如 i18next)**:
  直接在前端构建 React Context 传递 `language` 状态与 `t` 转换函数。这保证了代码体积极小、零编译依赖，且易于维护。
- **目录规划**:
  - `web/src/translations.js`: 存放键值映射。
  - `web/src/i18n.jsx`: 存放 React 语言 Context 及 Hook。

## Risks / Trade-offs

- **[Risk] 凭证中存在重复的域名/键值冲突**
  - *Mitigation*: 正常情况下同一账号的不同 cookie 文件拼接不会产生问题；如果存在多账号的同一域名 cookie，拼接后后写入的规则会覆盖前规则（这与浏览器加载逻辑一致）。提示用户尽量只导入不同平台的凭证，或同一平台保留单个有效凭证。
