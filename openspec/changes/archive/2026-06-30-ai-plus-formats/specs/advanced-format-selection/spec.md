## ADDED Requirements

### Requirement: Extract detailed format information
The system SHALL extract and return detailed video and audio format information from the downloaded media URL.

#### Scenario: Parse a valid video URL
- **WHEN** the user inputs a valid video URL and triggers the parse action
- **THEN** the backend SHALL parse the video and return `video_formats` and `audio_formats` separately with resolution, codec, fps, and filesize.

### Requirement: Display grouped format selection
The frontend SHALL display available formats grouped by "Video" and "Audio Only".

#### Scenario: Rendering format options
- **WHEN** the backend returns parsed `video_formats` and `audio_formats`
- **THEN** the frontend `DownloadPanel` SHALL display a dropdown rendering these options via `<optgroup>`.
