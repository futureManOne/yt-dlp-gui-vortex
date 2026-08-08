## Why

用户反馈亮色毛玻璃主题（Light Glassmorphism）在右侧边栏（Dashboard Sidebar）上存在严重的样式细节和可读性问题：
1. 卡片的阴影过于浓重，在亮色背景下显得脏。
2. 网站导航瓦片（YouTube, Bilibili等）中的文字颜色硬编码为白色，导致在白色背景下几乎看不见；且悬停态背景和文字对比度极低。
3. 统计数字的霓虹色（青色、黄色、绿色）太亮，在浅色背景下缺乏足够的对比度。
4. 存储容量条的进度轨道背景几乎透明，进度条填充是荧光绿，在白卡片中看不清。

## What Changes

- **毛玻璃阴影轻量化**：调整 `.theme-light .glass-card` 的 `box-shadow` 为浅灰色柔和阴影，增加白色顶部内发光（inset highlight），呈现高档磨砂质感。
- **网站卡片样式调整**：将 `.theme-light .site-tile` 的文字颜色设为深炭灰色，并细化悬停态（hover）下的边框、背景及投影颜色，为不同网站（YouTube等）定制高对比悬停效果。
- **任务统计状态数值对比度提升**：亮色模式下将下载中（primary）数值调为深蓝，队列中（warning）数值调为深橙，已完成（success）数值调为深绿，取消文字发光阴影。
- **磁盘容量条重度适配**：将轨道背景调整为较深灰色透明，填充条调整为清爽的蓝紫渐变，可用空间数值调为深绿。

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `theme-management`: 优化 Light Glassmorphism 亮色主题中右侧边栏卡片的阴影虚化、网站链接文字颜色及悬停高亮、任务统计数字和磁盘容量条的视觉对比度。

## Impact

- **Affected code**:
  - `web/src/index.css` (在 `.theme-light` 下追加特异性规则)
- **Dependencies**: 无
