## Why

目前系统仅支持加载单个 Netscape 格式的 cookies.txt 文件，当用户需要同时下载来自不同平台（例如 YouTube 和 Bilibili）的限制视频时，每次都需要重新覆盖导入，使用体验极不方便。
此外，系统当前所有文本都是中文硬编码，无法满足英文用户的需求。因此，需要引入多凭证并发管理和统一的国际化（中英文切换）多语言包支持。

## What Changes

- **多凭证管理 (Multi-Credentials Management)**:
  - 凭证管理界面支持导入和保存多个 Netscape 格式的 `.txt` 凭证文件。
  - 用户可查看当前载入的全部凭证文件列表（名称、文件大小、上传时间等），并可选择性删除特定凭证。
  - 在发起视频解析或下载任务时，系统会自动将所有已上传的凭证文件内容合并为一份临时 cookies 输入提供给 yt-dlp 使用，免除手动来回切换的烦恼。
- **中英文多语言切换 (Internationalization / i18n)**:
  - 新增系统语言包机制，将前端 UI 的硬编码文本全部提取至独立的语言配置文件中。
  - 在“通用设置”面板新增“系统语言 (Language)”切换选项（中文 / English），选择后即时渲染生效并持久化存储在 localStorage 中。

## Capabilities

### New Capabilities
- `multi-credentials`: 允许用户导入、查看、删除多个 Cookie 凭证，并在发起 yt-dlp 解析和下载任务时自动合并所有凭证以提供多平台支持。
- `internationalization`: 提供统一的多语言框架，支持中英文界面文本的实时切换与持久化，将所有 hardcoded 文字移入语言配置文件。

### Modified Capabilities

## Impact

- **Affected code**:
  - `web_server.py` (新增多凭证上传、查询与删除的 HTTP APIs，修改 `/api/parse` 和 `/api/download` 的凭证获取与合并逻辑)
  - `web/src/App.jsx` (调整凭证管理及多语言状态，增加 i18n 辅助方法或 Context)
  - `web/src/components/Navigation.jsx`, `DownloadPanel.jsx`, `TasksPanel.jsx`, `DashboardPanel.jsx`, `CookiesPanel.jsx`, `SettingsPanel.jsx` (接入多语言翻译，并在 `CookiesPanel` 和 `SettingsPanel` 扩展相应的功能 UI)
- **Dependencies**: 无新增第三方库依赖，保持轻量化实现。
