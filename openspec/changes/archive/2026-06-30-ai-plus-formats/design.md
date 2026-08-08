## Context

当前 yt-dlp 桌面端仅提供最基本的画质选项下拉菜单（通过过滤 height），并且没有接入任何基于视频上下文的智能分析功能。为了满足高级用户的需求（需要特定编码如 H.264、AV1，或者纯粹下载高质量音频）并探索 AI 赋能的可能性，我们将改造前端的格式渲染机制以及后端的 API 响应。

## Goals / Non-Goals

**Goals:**
- 将来自 yt-dlp 后端的 `formats` 信息细化提取为 `video_formats` 和 `audio_formats`。
- 在前端 UI 展示详尽的帧率、编码、文件大小。
- 增加一个轻量级的基于 `/api/ai/summarize` 的功能演示，以便未来可以平滑接入真实的 LLM 服务。

**Non-Goals:**
- 暂不包含真实的大模型云端接入认证流程。
- 不更改现有的后台多线程下载核心逻辑（目前 `format` 构建逻辑保持向后兼容，即前端仍然可以传递 `selected_height`，而高级音频则使用特殊的 ID 或 fallback 参数）。

## Decisions

- **Formats 数据结构**: 在 `/api/parse` 返回 `video_formats` 数组和 `audio_formats` 数组。过滤掉 `vcodec == 'none'` 和 `acodec == 'none'` 的无效信息。
- **UI 下拉分组**: 使用 `<optgroup>` 在现有的 Select 组件中按视频和纯音频进行分组展示。
- **AI 摘要 API**: 通过 `/api/ai/summarize` 提供模拟的延时响应以打通前后端联动逻辑，返回基于 title 和 description 的内容总结。

## Risks / Trade-offs

- **Risk: UI 过长**: 获取所有可下载的音视频格式可能导致下拉框选项非常多。
  - *Mitigation*: 仅保留不重复且有效的 `height/fps/codec` 组合，按分辨率倒序排列，折叠或采用原生的 `<select>` 组件以保证体验。
- **Risk: 后端改变 `ydl_opts` 的 format_id**: 如果用户选择了特定编码，仅靠 `selected_height` 不足以精确定位下载。
  - *Mitigation*: 本次改动作为渐进式增强，仍将选项映射为 `height`（作为向下兼容）。后续可迭代为完全依赖 `format_id` 的匹配模式。
