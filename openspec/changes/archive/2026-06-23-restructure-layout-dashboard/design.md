## Context

The current GUI layout has a sidebar (Vortex Logo, URL textarea, Cookies import, settings) and a main section (Active downloading tasks). When empty, the main area is mostly blank. We will restructure the client layout to separate operations into a leftmost vertical navigation bar and switchable boards, while leveraging the right side space for dashboard widgets and guides.

## Goals / Non-Goals

**Goals:**
- Add a narrow vertical navigation bar (`.nav-sidebar`, width `64px`) on the far left.
- Implement React view switching: "下载" (Download Home), "凭证" (Cookies), "设置" (Settings).
- Move Control panel contents (Cookie import, General settings) into dedicated views, keeping the side panel clean.
- Fill right-side space on the Download Home view:
  - Add **Dashboard Summary Widgets**: Disk Space Free/Total card, completed tasks counter.
  - Add a **Supported Sites guide grid**: Colorful quick cards for YouTube, Bilibili, TikTok, Douyin, etc.
- Implement a backend directory space utility endpoint inside `/api/config` to check available bytes using `shutil.disk_usage`.

**Non-Goals:**
- Changing downloader queue limits.
- Storing permanent download history in sqlite/file database (will use localStorage or active tasks polling).

## Decisions

### 1. Backend config extension
Modify `/api/config` GET handler in `web_server.py`:
- Fetch `download_dir` path from configuration.
- Call `shutil.disk_usage(download_dir)` to get total and free bytes.
- Return `free_space` (free bytes) and `total_space` (total bytes) in the config payload.

### 2. Frontend Navigation structure
- Introduce state `const [activeTab, setActiveTab] = useState('download')` in `App.jsx`.
- Render a `.nav-sidebar` layout:
  - Download icon -> sets `activeTab` to `'download'`
  - Cookies icon -> sets `activeTab` to `'cookies'`
  - Settings icon -> sets `activeTab` to `'settings'`
- Render a middle `.panel-content` container which displays components selectively:
  - `'download'`: URL textarea + Parse button + Parsed video metadata card.
  - `'cookies'`: Cookies dropzone + Browser selection.
  - `'settings'`: Download path input + selector + format selector.

### 3. Dashboard overview & Supported Sites
On the right column (when `'download'` view is active), split the area into:
- Right column left: Download tasks list (`flex: 1`).
- Right column right (dashboard sidebar, width `280px`):
  - **Storage space gauge**: Card displaying "Free Disk Space" (formatted e.g. "X GB Free of Y GB").
  - **Guide Card**: "Supported Websites" grid displaying YouTube, Bilibili, TikTok, Douyin tiles with hover-zoom glow.

## Risks / Trade-offs

- **[Risk]**: `shutil.disk_usage` can raise exception on Windows if download path is invalid or unmapped.
  - **Mitigation**: Wrap the disk usage call in a `try...except` block and default to 0 values, returning null to frontend which hides the Disk Card.
