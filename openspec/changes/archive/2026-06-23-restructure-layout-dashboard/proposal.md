## Why

The current GUI interface layout puts all elements (URL textarea, cookies import, general settings) on the left sidebar, which feels cluttered. Simultaneously, the right-side task monitor area feels too empty and underutilized when there are no active downloads. To optimize screen space usage and improve usability, we need to:
1. Split the interface into logical boards/views.
2. Introduce a leftmost vertical navigation bar (sidebar menu) for quick switching.
3. Optimize the right-side layout by introducing overview stats and guide cards to fill the empty space.

## What Changes

1. **Structural Layout Overhaul**:
   - Change the layout grid: add a narrow vertical sidebar on the far left (`.nav-sidebar`) showing navigation icons (Download Home, Cookies Import, General Settings).
   - Divide the app into three switchable views:
     - **Download Home**: Video URLs textarea, parse card, active task cards, and new right-side dashboard panels.
     - **Cookies Import**: Dedicated board for dragging and dropping Cookie txt files or selecting browser extraction.
     - **General Settings**: Dedicated settings board for path editing, format selection, and restored defaults.
   
2. **Right-Side Space Optimization (Dashboard Overview)**:
   - Add a top dashboard stats section above/alongside the tasks:
     - **Storage Space Card**: Displays free disk storage space remaining in the current download directory.
     - **Speed Chart / Speedometer**: Visual summary showing active downloading speed metrics.
     - **Overview Stats**: Counters for active tasks, completed tasks, and total size downloaded.
   - Add a **Supported Sites** section listing colorful, modern animated grid tiles (Bilibili, YouTube, TikTok, Douyin, Twitter, etc.) with logo icons to guide users and utilize empty spaces.

3. **Dependencies**:
   - Use Lucide Icons (or lightweight Lucide SVG components) for unified and high-quality nav icons.

## Capabilities

### New Capabilities
- `restructure-layout-dashboard`: Split GUI panel controls into separate nav boards (Download, Cookies, Settings) and introduce dashboard overview metrics (storage, bandwidth counters) to optimize the right column space.

### Modified Capabilities
<!-- None -->

## Impact

- `web/src/App.jsx`: Restructure render logic, implement navigation tab switching, read and calculate disk space stats, render supported site grids, and render dashboard widgets.
- `web/src/index.css`: Style `.nav-sidebar`, adjust layout grids, format dashboard grid widgets, and style supported site list components.
