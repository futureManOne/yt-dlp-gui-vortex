## Context

浅色毛玻璃模式在实际渲染时，一些全局色彩微调以及继承规则没有被很好覆盖，比如右侧边栏卡片的阴影在浅色背景下过于明显；硬编码的文字白色与浅色卡片几乎融为一体；统计数据的荧光色在大面积白背景下几乎不可见。

需要对 `.theme-light` 下的主题相关元素样式进行专门的覆盖微调，优化可读性。

## Goals / Non-Goals

**Goals:**
- 将 `.theme-light` 模式下的 `.glass-card` 的阴影调整为淡灰色柔和阴影，增加浅白色内发光，以达到高级毛玻璃质感。
- 修改 `.theme-light .site-tile` 的文字颜色、边框和背景，确保它们在正常与 hover 状态下都具有良好的对比度与视觉提示。
- 调整 `.theme-light` 下的统计数据数字，将其原本的荧光青、黄、绿分别修改为符合无障碍对比度标准的深蓝、深橙和深绿，移除文字发光效果。
- 优化 `.theme-light` 中的磁盘空间容量条，使其进度轨道（track）显示为清晰的半透明浅灰色，进度条填充改为蓝紫渐变，可用空间数值调为深绿。

**Non-Goals:**
- 不重构 React 组件的 HTML/JSX 结构，仅通过修改 `index.css` 达成效果。

## Decisions

- **阴影微调**：
  ```css
  .theme-light .glass-card {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
  }
  ```
- **快捷导航按钮 (Site tiles)**：
  将默认文字颜色指定为 `#1D1D1F` 并覆盖 hover 特异变量（如 `--tile-hover-border`）。
- **任务统计颜色**：
  为浅色模式重新定义对比鲜明的数值字色，替代荧光发光体。

## Risks / Trade-offs

- **[Risk] 部分第三方浏览器（或 pywebview 所使用的渲染引擎）对 `backdrop-filter` 磨砂支持不佳**
  - *Mitigation*: 采用 `rgba(255, 255, 255, 0.65)` 具备 65% 的基础白度，在不支持模糊的旧版引擎中也可以清晰看清文本内容。
