## Context

The React GUI frontend utilizes native styling and state variables inside `web/src/App.jsx` and `web/src/index.css`. The Python backend runs `web_server.py` which provides endpoints for downloading and system control. There are some visual discrepancies (default styles, lack of animations, plain console log representation) and minor interactive gaps (no way to clear textarea, no quick way to open folder, and a non-functional Pause button).

## Goals / Non-Goals

**Goals:**
- Upgrade the application styling with custom dark-theme border glows, button hover micro-animations, structured premium video preview card, and styled CLI-like terminal log views.
- Add dynamic URL links count indicator and URL "Clear" button in the textarea sidebar section.
- Replace/hide the non-functional "Pause/Resume" button with appropriate task actions:
  - For active tasks: hide/remove the useless Pause button.
  - For finished/cancelled/error tasks: replace it with a "Delete/Hide Task Card" button (Trash bin icon) allowing users to clear individual records from the UI.
- Add an "Open Folder" shortcut button in General Settings next to the path selector.
- Add a "Copy Logs" button inside the task console log panel.
- Implement a backend route `POST /api/open-dir` to support opening any specified path in the host file explorer.

**Non-Goals:**
- Implementing actual download pause/resume logic inside `yt-dlp` or the backend downloader worker threads.
- Altering downloader queue logic or format configuration structures.

## Decisions

### 1. Backend API Extension
Add a new POST endpoint in `web_server.py`:
- `POST /api/open-dir`: Expects `{"dir": "path/to/folder"}`. Resolves the folder path (falling back to current working directory if path is invalid or empty) and calls `os.startfile(open_path)` on Windows.
This allows the frontend settings panel to open the current download directory directly.

### 2. Frontend UX Actions
- **URL Clear**: Add a state-clearing button next to the textarea. Clicking it resets `urls` to `""` and updates count.
- **URL Count**: Split `urls` by `\n` to calculate the number of non-empty links and show a counter indicator (e.g. `2 links found`).
- **Individual Task Hiding**: Utilize the existing `clearedTaskIds` Set state. When the trash icon button is clicked on a finished task, add its ID to the set to trigger reactivity and filter it from `visibleTasks`.
- **Log Console Terminal Styling & Copying**:
  - Add a "Copy Logs" button on top of the log console that formats the log lines into a single text block and writes it to `navigator.clipboard`.
  - Color-code warnings (yellow) and errors (red) for quick visual scanning.

### 3. CSS Premium Enhancements
- Apply transition durations to all scale, opacity, and transform animations.
- Introduce a breathing pulse animation (`progress-breathing-glow`) to the download progress bar to show active execution.
- Create stylish card borders using translucent border shadows and smooth linear gradients (`--primary-grad`).
- Customize scrollbar tracks to match the dark theme background.

## Risks / Trade-offs

- **[Risk]**: The user input path might not exist or might fail to open on the operating system.
  - **Mitigation**: The backend will wrap `os.startfile` in a `try...except` block, return a JSON error response, and the frontend will show an error toast.
- **[Risk]**: `navigator.clipboard` is restricted to secure contexts (localhost/HTTPS) or inside PyWebView.
  - **Mitigation**: Provide fallback checks. Since the GUI runs on `localhost` (127.0.0.1) and via native WebView2, `navigator.clipboard.writeText` is fully supported.
