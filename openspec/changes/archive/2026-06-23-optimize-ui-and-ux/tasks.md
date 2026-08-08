## 1. Backend API Implementation

- [x] 1.1 Add the `/api/open-dir` POST route in `web_server.py` with directory validation and Windows folder opening logic.

## 2. Frontend UX Implementation

- [x] 2.1 Update the URL Textarea component in `web/src/App.jsx` to display a dynamic line-break link count and add a "Clear" button.
- [x] 2.2 Implement the "Delete/Hide Task Card" button action on completed, cancelled, and error task cards in `web/src/App.jsx` using `clearedTaskIds`.
- [x] 2.3 Hide the non-functional "Pause/Resume" button for active download task cards in `web/src/App.jsx`.
- [x] 2.4 Add an "Open Download Folder" button next to the directory text input in the settings panel and hook it up to call the new `/api/open-dir` endpoint.
- [x] 2.5 Add a "Copy Logs" button in the task console log panel that copies all current logs to the clipboard and shows a toast.

## 3. CSS Styling & Polish

- [x] 3.1 Apply border gradient glows, soft shadow reflections, and modern custom scrollbars matching the dark theme in `web/src/index.css`.
- [x] 3.2 Add transition states and hover micro-animations (translateY, brightness, scale) for all interactive buttons and select menus in `web/src/index.css`.
- [x] 3.3 Style the parsed preview card with hover-zoom thumbnail support and a custom select box in `web/src/index.css`.
- [x] 3.4 Revamp the task log console to resemble a retro-modern CLI terminal with customized warning/error text colors in `web/src/index.css`.
- [x] 3.5 Polish the empty state view with modern SVG layouts and typography, and style the progress bar with a breathing glow animation (`progress-breathing-glow`) in `web/src/index.css`.

## 4. Compilation & Verification

- [x] 4.1 Run the frontend build command in the `web` directory to compile all assets into `web/dist`.
- [x] 4.2 Run the local server and verify all layout optimizations, animations, individual task card hiding, URL counts, folder opening, and log copying works seamlessly.
