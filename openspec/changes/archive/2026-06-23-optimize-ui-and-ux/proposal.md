## Why

The current yt-dlp GUI console has some visual and interactive limitations that detract from a premium user experience:
1. Inputs and buttons lack rich interactive feedback (hover micro-animations, active/focus states).
2. The video parse preview card and active download task cards have a generic design that lacks smooth transitions, visual hierarchy, and intuitive actions.
3. The "Pause/Resume" button is a non-functional placeholder (since the backend doesn't support pause/resume), and there's no way to clear/hide an individual task card once it's finished.
4. There is no quick "Open Download Folder" button in the Settings panel, making directory management inconvenient.
5. The URL input textarea has no link counter or simple "Clear" button.

## What Changes

1. **UX & Functional Enhancements**:
   - Add a dynamic link counter under the URL textarea (e.g. "X links detected").
   - Add a "Clear" button (X icon) inside/near the URL textarea.
   - For completed, cancelled, or error task cards, replace the non-functional "Pause/Resume" button with a "Delete/Hide Card" button (Trash bin icon) so users can remove individual tasks from the screen.
   - Disable/hide the "Pause/Resume" button for active downloads to avoid user confusion (since the backend has no endpoint for it).
   - Add a "Copy Logs" button inside each task console to copy download logs easily.
   - Add an "Open Download Folder" button directly next to the Path input in the General Settings section.
   
2. **UI & Premium Visual Style**:
   - Enhance the overall dark-mode glassmorphic theme: add sleek border gradients, glowing backdrops, and harmonious color accents.
   - Redesign the parsed video preview card to look extremely polished (hover zoom on thumbnail, styled select box, layout with proper spacing and text sizing).
   - Add a breathing glowing animation to the progress bar for active downloads.
   - Revamp the console output area to resemble a retro-modern CLI terminal (with terminal header, custom scrollbar, copy action, and color-coded message lines for Warnings/Errors).
   - Update the empty-state illustration and typography to feel more modern, active, and helpful.
   - Add subtle hover animations and active scaling effects to all buttons, selectors, and panels.

## Capabilities

### New Capabilities
- `ui-ux-optimization`: Modernize the visual style, improve layout consistency, and add essential interaction feedback (dynamic counters, individual task clearing, console log actions, and settings paths) for the downloader GUI.

### Modified Capabilities
<!-- None -->

## Impact

- `web/src/App.jsx`: Modify URL textarea, parsed card actions, setting buttons, task cards, and logs console logic.
- `web/src/index.css`: Upgrade variables, card themes, buttons, borders, glow effects, progress animations, and custom styling.
- `web/dist/`: Production build output, compiled from frontend source.
