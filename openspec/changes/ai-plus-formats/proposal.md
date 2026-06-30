## Why

目前在解析视频后，用户只能看到简单的分辨率选项（如 1080p, 720p），无法得知或选择具体的视频编码、帧率以及音频质量等细节，这降低了对于高级用户的可用性。
同时，随着 AI 的普及，在下载视频之前或之后，引入 AI 智能摘要功能，可以极大帮助用户判断该视频是否具有下载/观看的价值，打造顺应时代潮流的 "AI+ 视频下载器"。

## What Changes

- 修改后端解析逻辑 (`/api/parse`)，不仅提取统一的 `resolutions`，还提取详尽的 `video_formats` 与 `audio_formats` 列表。
- 修改前端 `DownloadPanel.jsx` 以分组下拉框的形式展示上述音视频详情格式（分辨率、帧率、编码、文件大小）。
- 在前端解析结果卡片中增加一个 "AI 智能摘要" 按钮。
- 后端新增 `/api/ai/summarize` 接口用于接收请求，并返回 AI 解析后的视频省流摘要（目前可使用 Mock 数据以打通流程，后续可快速接入真实大模型 API）。

## Capabilities

### New Capabilities
- `advanced-format-selection`: 提供更精细的音视频质量解析和选择功能。
- `ai-summarization`: 通过 AI 为视频内容生成智能文字摘要，评估内容价值。

### Modified Capabilities
- `ui-ux-optimization`: 更新 `DownloadPanel` 以容纳更高级的下拉选择与 AI 分析功能 UI 交互。

## Impact

- 后端核心 `web_server.py`: 将扩展 `/api/parse` 返回的数据结构，同时新增一个 `/api/ai/summarize` 的 API。
- 前端组件 `web/src/components/DownloadPanel.jsx`: 需要新增格式分组列表组件与 AI 交互逻辑（包含状态管理和 UI 展示）。
