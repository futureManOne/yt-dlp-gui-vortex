# ui-ux-optimization Specification

## Purpose
TBD - created by archiving change optimize-ui-and-ux. Update Purpose after archive.
## Requirements
### Requirement: URL Textarea Interactions
The system SHALL display the count of input URLs in real-time under the URL input area and provide a "Clear" button to easily empty the URL textarea.

#### Scenario: Real-time URL count update
- **WHEN** user types or pastes multiple video links separated by lines into the URL textarea
- **THEN** the system shows "X links detected" below the textarea

#### Scenario: Clear URL input
- **WHEN** user clicks the "Clear" button next to the URL input area
- **THEN** the system empties the URL textarea and resets the URL count to 0

### Requirement: Individual Task Hiding
The system SHALL provide a "Delete" (trash bin icon) button on each finished, cancelled, or error task card to allow users to hide individual task cards from the active list.

#### Scenario: Hide a finished task card
- **WHEN** user clicks the "Delete" button on a finished, cancelled, or error task card
- **THEN** the system hides that specific task card from the active task view

### Requirement: Download Folder Management
The system SHALL provide a button next to the download directory input in the Settings panel to allow users to open the current download directory directly.

#### Scenario: Open download directory from settings
- **WHEN** user clicks the "Open Folder" button in the Settings panel
- **THEN** the system requests the backend to open the selected download directory in the file manager

### Requirement: Modern Terminal Console
The system SHALL present each task's logs in a styled retro-modern terminal box with color-coded severity lines and a "Copy Logs" button.

#### Scenario: Color-coded logs
- **WHEN** log lines are loaded in the task terminal
- **THEN** lines containing `[ERROR]` are colored red and lines containing `[WARNING]` are colored yellow

#### Scenario: Copy logs
- **WHEN** user clicks the "Copy Logs" button on a task console
- **THEN** the system copies all logs of that task to the clipboard and shows a success toast

### Requirement: Download Panel Video Parsing Display
The system MUST display the parsed video details gracefully in the Download Panel.

#### Scenario: User views parsed video information
- **WHEN** the video is successfully parsed
- **THEN** the system SHALL display the video thumbnail, title, duration, an advanced dropdown for all formats (video vs audio), and an AI Summary button inside a preview card.

