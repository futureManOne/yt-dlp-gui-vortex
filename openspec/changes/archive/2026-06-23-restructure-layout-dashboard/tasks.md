## 1. Backend Implementation

- [ ] 1.1 Add disk usage calculations using `shutil.disk_usage` inside the `/api/config` GET endpoint in `web_server.py` and return `free_space`/`total_space`.

## 2. Frontend Restructuring

- [ ] 2.1 Install the `lucide-react` icon package inside the `web` project directory.
- [ ] 2.2 Refactor layout in `web/src/App.jsx` to render the leftmost vertical sidebar (`.nav-sidebar`), active views inside the middle `.sidebar` column, and tasks/dashboard in the right `.main-content` column.
- [ ] 2.3 Implement state variables and click transitions for tab switching (`download`, `cookies`, `settings`) in `web/src/App.jsx`.

## 3. Right-Side Space Optimization (Dashboard)

- [ ] 3.1 Implement storage space visualization widgets (Disk Space card) inside the right column in `web/src/App.jsx`, retrieving values from fetched config.
- [ ] 3.2 Add a modern grid of animated guide tiles for popular sites (YouTube, Bilibili, TikTok, Douyin, Twitter, etc.) on the right side of the Download Home view in `web/src/App.jsx`.

## 4. CSS Styling & Layout Polish

- [ ] 4.1 Update grid system styles (`grid-template-columns`), vertical nav-sidebar designs, active icon glows, and transitions in `web/src/index.css`.
- [ ] 4.2 Style dashboard cards, site tiles, disk usage progress indicators, and overall dashboard layout responsiveness in `web/src/index.css`.

## 5. Compilation & Verification

- [ ] 5.1 Run `npm run build` inside `web` to compile the app and launch `run_gui.py` to confirm tab switches, dashboard disk widgets, and site guides.
