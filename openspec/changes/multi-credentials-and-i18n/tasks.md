## 1. i18n Frontend Setup & Translations

- [ ] 1.1 创建 `web/src/translations.js` 语言包对照字典文件
- [ ] 1.2 创建 `web/src/i18n.jsx` 提供 `LanguageProvider` 和 `useTranslation` React 钩子
- [ ] 1.3 更新前端入口，将 App 组件使用多语言 Provider 包裹

## 2. 前端组件国际化 (i18n Integration)

- [ ] 2.1 修改 `Navigation.jsx`，将界面菜单及标签文本替换为翻译 Key
- [ ] 2.2 修改 `DownloadPanel.jsx`，将下载和解析面板文字替换为翻译 Key
- [ ] 2.3 修改 `TasksPanel.jsx`，将任务列表与日志控制台文本替换为翻译 Key
- [ ] 2.4 修改 `DashboardPanel.jsx`，将右侧边栏仪表盘文本替换为翻译 Key
- [ ] 2.5 修改 `SettingsPanel.jsx`，添加中英文语言切换下拉选择框并应用翻译 Key
- [ ] 2.6 重构主逻辑 `App.jsx` 中的 Toast 消息提示和弹窗文本，完成全站双语适配

## 3. 后端多凭证管理 (Backend Multi-Credentials)

- [ ] 3.1 修改 `web_server.py` 的配置文件加载/保存逻辑，支持 `cookie_files` 列表数据结构
- [ ] 3.2 修改 `web_server.py` 中的 `/api/cookie` 保存接口，生成唯一 ID 并保存到 `cookies` 目录中，在配置列表追加元数据
- [ ] 3.3 在 `web_server.py` 中实现 `/api/cookie/delete` 删除接口，移除对应物理凭证文件并从配置中剔除元数据
- [ ] 3.4 在 `web_server.py` 中编写合并凭证工具函数，将 `cookies/*.txt` 合并为一个临时 Netscape `.txt` 文本
- [ ] 3.5 调整 `web_server.py` 的 `/api/parse` 和 `/api/download` 调用流程，通过上述合并函数生成合并凭证，传递给 yt-dlp 使用

## 4. 前端凭证面板重构 (Frontend UI for Multi-Cookies)

- [ ] 4.1 重构 `CookiesPanel.jsx` 界面，支持上传多个文件，并用列表/表格展示当前的全部凭证（包含名称、大小、删除按钮）
- [ ] 4.2 重构 `App.jsx` 的凭证添加与删除操作方法，联动后端 API 维护多凭证列表状态

## 5. 编译构建与功能验证

- [ ] 5.1 运行前端编译构建 `npm run build` 确保无编译和打包错误
- [ ] 5.2 启动 GUI，测试中英文统一语言切换，确认全站所有菜单及操作提示无遗漏
- [ ] 5.3 测试导入多份不同网站的 Cookie 凭证（例如 youtube / bilibili），验证列表新增与删除功能
- [ ] 5.4 提交限额或私密视频的解析与下载任务，在控制台观察日志，验证合并凭证被正确调用和解析成功
